import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, ...data } = await req.json()

    switch (action) {
      case 'process-weekly-payouts':
        return await processWeeklyPayouts(supabaseClient)
      
      case 'process-instant-payout':
        return await processInstantPayout(supabaseClient, data)
      
      case 'verify-payment-method':
        return await verifyPaymentMethod(supabaseClient, data)
      
      case 'get-payout-status':
        return await getPayoutStatus(supabaseClient, data)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
    }
  } catch (error) {
    console.error('Error in driver payout processor:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function processWeeklyPayouts(supabase: any) {
  try {
    console.log('Processing weekly payouts...')
    
    // Get all drivers with pending earnings and weekly payout schedule
    const { data: driversWithEarnings, error: driversError } = await supabase
      .from('driver_earnings')
      .select(`
        driver_id,
        SUM(total_earnings) as total_pending,
        COUNT(*) as trips_count
      `)
      .eq('status', 'pending')
      .groupBy('driver_id')

    if (driversError) throw driversError

    const payoutsProcessed = []

    for (const driver of driversWithEarnings) {
      // Get driver's default payment method with weekly schedule
      const { data: paymentMethod, error: methodError } = await supabase
        .from('driver_payment_methods')
        .select('*')
        .eq('driver_id', driver.driver_id)
        .eq('is_default', true)
        .eq('is_active', true)
        .eq('payout_schedule', 'weekly')
        .single()

      if (methodError || !paymentMethod) {
        console.log(`No weekly payment method for driver ${driver.driver_id}`)
        continue
      }

      // Check minimum payout amount
      if (driver.total_pending < paymentMethod.minimum_payout_amount) {
        console.log(`Driver ${driver.driver_id} below minimum payout amount`)
        continue
      }

      // Calculate fees
      const platformFee = driver.total_pending * 0.15 // 15% platform commission
      const processingFee = 2.50 // Fixed processing fee
      const netAmount = driver.total_pending - platformFee - processingFee

      if (netAmount <= 0) {
        console.log(`Driver ${driver.driver_id} net amount too low after fees`)
        continue
      }

      // Create payout record
      const { data: payout, error: payoutError } = await supabase
        .from('driver_payouts')
        .insert({
          driver_id: driver.driver_id,
          payment_method_id: paymentMethod.id,
          amount: driver.total_pending,
          platform_fee: platformFee,
          processing_fee: processingFee,
          net_amount: netAmount,
          period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          period_end: new Date().toISOString(),
          trips_included: driver.trips_count,
          status: 'processing',
          payout_type: 'automatic',
          description: 'Weekly automatic payout'
        })
        .select()
        .single()

      if (payoutError) {
        console.error(`Error creating payout for driver ${driver.driver_id}:`, payoutError)
        continue
      }

      // In production, this would integrate with Stripe Connect or similar
      // For now, we'll simulate the payout process
      const payoutResult = await simulateStripeTransfer(paymentMethod, netAmount)

      if (payoutResult.success) {
        // Update payout status to paid
        await supabase
          .from('driver_payouts')
          .update({
            status: 'paid',
            stripe_transfer_id: payoutResult.transfer_id,
            processed_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          })
          .eq('id', payout.id)

        // Update earnings status to paid
        await supabase
          .from('driver_earnings')
          .update({
            status: 'paid',
            payout_id: payout.id
          })
          .eq('driver_id', driver.driver_id)
          .eq('status', 'pending')

        payoutsProcessed.push({
          driver_id: driver.driver_id,
          net_amount: netAmount,
          status: 'paid'
        })
      } else {
        // Update payout status to failed
        await supabase
          .from('driver_payouts')
          .update({
            status: 'failed',
            failure_reason: payoutResult.error,
            failure_code: payoutResult.code
          })
          .eq('id', payout.id)

        payoutsProcessed.push({
          driver_id: driver.driver_id,
          net_amount: netAmount,
          status: 'failed',
          error: payoutResult.error
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${payoutsProcessed.length} payouts`,
        payouts: payoutsProcessed
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error processing weekly payouts:', error)
    throw error
  }
}

async function processInstantPayout(supabase: any, data: any) {
  try {
    const { driver_id, payment_method_id } = data

    // Get pending earnings for this driver
    const { data: earnings, error: earningsError } = await supabase
      .from('driver_earnings')
      .select('SUM(total_earnings) as total_pending, COUNT(*) as trips_count')
      .eq('driver_id', driver_id)
      .eq('status', 'pending')
      .single()

    if (earningsError) throw earningsError

    if (!earnings.total_pending || earnings.total_pending <= 0) {
      return new Response(
        JSON.stringify({ error: 'No pending earnings available' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get payment method
    const { data: paymentMethod, error: methodError } = await supabase
      .from('driver_payment_methods')
      .select('*')
      .eq('id', payment_method_id)
      .eq('driver_id', driver_id)
      .eq('is_active', true)
      .single()

    if (methodError || !paymentMethod) {
      return new Response(
        JSON.stringify({ error: 'Invalid payment method' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Calculate fees (higher for instant payouts)
    const platformFee = earnings.total_pending * 0.15 // 15% platform commission
    const processingFee = 5.00 // Higher fee for instant payouts
    const netAmount = earnings.total_pending - platformFee - processingFee

    if (netAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Amount too low after fees' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create payout record
    const { data: payout, error: payoutError } = await supabase
      .from('driver_payouts')
      .insert({
        driver_id: driver_id,
        payment_method_id: payment_method_id,
        amount: earnings.total_pending,
        platform_fee: platformFee,
        processing_fee: processingFee,
        net_amount: netAmount,
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        period_end: new Date().toISOString(),
        trips_included: earnings.trips_count,
        status: 'processing',
        payout_type: 'instant',
        description: 'Instant payout request'
      })
      .select()
      .single()

    if (payoutError) throw payoutError

    // Process instant payout
    const payoutResult = await simulateStripeTransfer(paymentMethod, netAmount, true)

    if (payoutResult.success) {
      // Update payout status
      await supabase
        .from('driver_payouts')
        .update({
          status: 'paid',
          stripe_transfer_id: payoutResult.transfer_id,
          processed_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })
        .eq('id', payout.id)

      // Update earnings status
      await supabase
        .from('driver_earnings')
        .update({
          status: 'paid',
          payout_id: payout.id
        })
        .eq('driver_id', driver_id)
        .eq('status', 'pending')

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Instant payout processed successfully',
          payout_id: payout.id,
          net_amount: netAmount
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      // Update payout status to failed
      await supabase
        .from('driver_payouts')
        .update({
          status: 'failed',
          failure_reason: payoutResult.error,
          failure_code: payoutResult.code
        })
        .eq('id', payout.id)

      return new Response(
        JSON.stringify({
          success: false,
          error: payoutResult.error
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
  } catch (error) {
    console.error('Error processing instant payout:', error)
    throw error
  }
}

async function verifyPaymentMethod(supabase: any, data: any) {
  try {
    const { payment_method_id, verification_documents } = data

    // In production, this would verify bank account details with Stripe or similar
    // For now, we'll simulate verification
    const isVerified = Math.random() > 0.2 // 80% success rate for demo

    const updateData: any = {
      verification_status: isVerified ? 'verified' : 'failed',
      verification_date: new Date().toISOString()
    }

    if (verification_documents) {
      updateData.verification_documents = verification_documents
    }

    if (!isVerified) {
      updateData.failure_reason = 'Unable to verify bank account details'
    }

    const { error } = await supabase
      .from('driver_payment_methods')
      .update(updateData)
      .eq('id', payment_method_id)

    if (error) throw error

    return new Response(
      JSON.stringify({
        success: true,
        verified: isVerified,
        message: isVerified ? 'Payment method verified successfully' : 'Verification failed'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error verifying payment method:', error)
    throw error
  }
}

async function getPayoutStatus(supabase: any, data: any) {
  try {
    const { payout_id } = data

    const { data: payout, error } = await supabase
      .from('driver_payouts')
      .select(`
        *,
        payment_method:driver_payment_methods(
          type,
          bank_name,
          account_number_last4,
          paypal_email,
          nickname
        )
      `)
      .eq('id', payout_id)
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({
        success: true,
        payout: payout
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error getting payout status:', error)
    throw error
  }
}

// Simulate Stripe transfer for demo purposes
async function simulateStripeTransfer(paymentMethod: any, amount: number, isInstant = false) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, isInstant ? 1000 : 3000))

  // Simulate 95% success rate
  const success = Math.random() > 0.05

  if (success) {
    return {
      success: true,
      transfer_id: `tr_${Math.random().toString(36).substr(2, 9)}`,
      amount: amount
    }
  } else {
    return {
      success: false,
      error: 'Transfer failed - insufficient funds or invalid account',
      code: 'transfer_failed'
    }
  }
}
