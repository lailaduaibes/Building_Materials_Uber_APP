/**
 * Supabase Edge Function for Payment Processing
 * Handles Stripe payments securely in the cloud
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.10.0'

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
    // Initialize Stripe (you'll need to add your Stripe secret key in Supabase dashboard)
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || 'sk_test_your_stripe_key_here', {
      apiVersion: '2024-06-20',
    })

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://pjbbtmuhlpscmrbgsyzb.supabase.co'
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid token')
    }

    const { action, ...payload } = await req.json()

    switch (action) {
      case 'add_card': {
        const { cardNumber, expiryMonth, expiryYear, cvc, holderName } = payload
        
        // Create Stripe customer if doesn't exist
        let customer
        const { data: existingCustomer } = await supabaseClient
          .from('customers')
          .select('stripe_customer_id')
          .eq('user_id', user.id)
          .single()

        if (existingCustomer?.stripe_customer_id) {
          customer = await stripe.customers.retrieve(existingCustomer.stripe_customer_id)
        } else {
          customer = await stripe.customers.create({
            email: user.email,
            metadata: { user_id: user.id }
          })
          
          // Save customer ID to database
          await supabaseClient
            .from('customers')
            .upsert({
              user_id: user.id,
              stripe_customer_id: customer.id
            })
        }

        // Create payment method
        const paymentMethod = await stripe.paymentMethods.create({
          type: 'card',
          card: {
            number: cardNumber,
            exp_month: expiryMonth,
            exp_year: expiryYear,
            cvc: cvc
          },
          billing_details: {
            name: holderName
          }
        })

        // Attach to customer
        await stripe.paymentMethods.attach(paymentMethod.id, {
          customer: customer.id
        })

        // Save to database
        const { data: savedMethod, error: dbError } = await supabaseClient
          .from('payment_methods')
          .insert({
            user_id: user.id,
            stripe_payment_method_id: paymentMethod.id,
            stripe_customer_id: customer.id,
            type: 'card',
            last4: paymentMethod.card?.last4,
            brand: paymentMethod.card?.brand,
            expiry_month: paymentMethod.card?.exp_month,
            expiry_year: paymentMethod.card?.exp_year,
            is_default: false,
            is_active: true
          })
          .select()
          .single()

        if (dbError) {
          throw new Error(`Database error: ${dbError.message}`)
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Payment method added successfully',
            paymentMethod: savedMethod
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'add_paypal': {
        const { email } = payload
        
        // Save PayPal to database
        const { data: savedMethod, error: dbError } = await supabaseClient
          .from('payment_methods')
          .insert({
            user_id: user.id,
            type: 'paypal',
            email: email,
            is_default: false,
            is_active: true
          })
          .select()
          .single()

        if (dbError) {
          throw new Error(`Database error: ${dbError.message}`)
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'PayPal payment method added successfully',
            paymentMethod: savedMethod
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'process_payment': {
        const { tripId, amount, paymentMethodId } = payload
        
        // Get payment method from database
        const { data: paymentMethod, error: pmError } = await supabaseClient
          .from('payment_methods')
          .select('*')
          .eq('id', paymentMethodId)
          .eq('user_id', user.id)
          .single()

        if (pmError || !paymentMethod) {
          throw new Error('Payment method not found')
        }

        if (paymentMethod.type === 'card' && paymentMethod.stripe_payment_method_id) {
          // Process Stripe payment
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'usd',
            payment_method: paymentMethod.stripe_payment_method_id,
            customer: paymentMethod.stripe_customer_id,
            confirm: true,
            return_url: 'https://yourdomain.com/return',
            metadata: {
              trip_id: tripId,
              user_id: user.id
            }
          })

          // Save transaction to database
          const { data: transaction, error: txError } = await supabaseClient
            .from('transactions')
            .insert({
              user_id: user.id,
              trip_id: tripId,
              payment_method_id: paymentMethod.id,
              stripe_payment_intent_id: paymentIntent.id,
              amount: amount,
              currency: 'USD',
              status: paymentIntent.status,
              transaction_type: 'payment'
            })
            .select()
            .single()

          if (txError) {
            console.error('Transaction save error:', txError)
          }

          return new Response(
            JSON.stringify({
              success: paymentIntent.status === 'succeeded',
              message: paymentIntent.status === 'succeeded' ? 'Payment processed successfully' : 'Payment requires additional action',
              paymentIntent: {
                id: paymentIntent.id,
                status: paymentIntent.status,
                client_secret: paymentIntent.client_secret
              },
              transaction: transaction
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          )
        } else {
          // Handle other payment types (PayPal, etc.)
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Payment type not supported for processing'
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }
      }

      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    console.error('Payment processor error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Failed to process payment request'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
