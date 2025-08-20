/**
 * Supabase Edge Function for Payment Processing
 * Handles Stripe payments securely in the cloud
 */

/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-06-20',
    })

    // Initialize Supabase client with proper URL
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
      case 'add-card':
        return await handleAddCard(stripe, supabaseClient, user.id, payload)
      
      case 'process-payment':
        return await handleProcessPayment(stripe, supabaseClient, user.id, payload)
      
      case 'get-payment-methods':
        return await handleGetPaymentMethods(supabaseClient, user.id)
      
      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function handleAddCard(stripe: Stripe, supabase: any, userId: string, payload: any) {
  try {
    const { cardDetails } = payload

    if (!cardDetails || !cardDetails.number || !cardDetails.expiryMonth || !cardDetails.expiryYear || !cardDetails.cvc) {
      throw new Error('Missing required card details')
    }

    // Create Stripe payment method
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: cardDetails.number,
        exp_month: cardDetails.expiryMonth,
        exp_year: cardDetails.expiryYear,
        cvc: cardDetails.cvc,
      },
      billing_details: {
        name: cardDetails.holderName || 'N/A',
      },
    })

    // Save to Supabase
    const { data, error } = await supabase
      .from('payment_methods')
      .insert([{
        user_id: userId,
        type: 'card',
        last4: paymentMethod.card?.last4,
        brand: paymentMethod.card?.brand,
        expiry_month: paymentMethod.card?.exp_month,
        expiry_year: paymentMethod.card?.exp_year,
        stripe_payment_method_id: paymentMethod.id,
        is_default: false
      }])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      throw new Error('Failed to save payment method: ' + error.message)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment method added successfully',
        paymentMethod: data
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error: any) {
    console.error('handleAddCard error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Failed to add payment method'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

async function handleProcessPayment(stripe: Stripe, supabase: any, userId: string, payload: any) {
  try {
    const { amount, paymentMethodId, orderId } = payload

    if (!amount || !paymentMethodId || !orderId) {
      throw new Error('Missing required payment parameters')
    }

    // Get payment method from database
    const { data: paymentMethod, error: pmError } = await supabase
      .from('payment_methods')
      .select('stripe_payment_method_id')
      .eq('id', paymentMethodId)
      .eq('user_id', userId)
      .single()

    if (pmError || !paymentMethod) {
      throw new Error('Payment method not found')
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethod.stripe_payment_method_id,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    })

    // Save payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        user_id: userId,
        order_id: orderId,
        payment_method_id: paymentMethodId,
        stripe_payment_intent_id: paymentIntent.id,
        amount: amount,
        currency: 'usd',
        status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'failed',
        failure_reason: paymentIntent.status !== 'succeeded' ? paymentIntent.last_payment_error?.message : null
      }])
      .select()
      .single()

    if (paymentError) {
      console.error('Failed to save payment record:', paymentError)
    }

    return new Response(
      JSON.stringify({
        success: paymentIntent.status === 'succeeded',
        message: paymentIntent.status === 'succeeded' ? 'Payment successful' : 'Payment failed',
        payment: payment,
        paymentIntentId: paymentIntent.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error: any) {
    console.error('handleProcessPayment error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Payment processing failed'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

async function handleGetPaymentMethods(supabase: any, userId: string) {
  const { data: methods, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('Failed to fetch payment methods')
  }

  return new Response(
    JSON.stringify({
      success: true,
      paymentMethods: methods
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}
