/**
 * Payment Backend API - Express server for Stripe integration
 * Handles payment methods, charges, and Supabase integration
 */

const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase configuration
const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'your_supabase_service_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Middleware
app.use(cors());
app.use(express.json());

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authorization token required' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ success: false, message: 'Token verification failed' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Payment API is running',
    timestamp: new Date().toISOString()
  });
});

// Add credit/debit card
app.post('/api/payment/add-card', verifyToken, async (req, res) => {
  try {
    const { cardDetails, userId } = req.body;
    
    // Validate input
    if (!cardDetails || !cardDetails.number || !cardDetails.expiryMonth || !cardDetails.expiryYear || !cardDetails.cvc) {
      return res.status(400).json({
        success: false,
        message: 'Card details are required',
        error: 'INVALID_CARD_DETAILS'
      });
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
        name: cardDetails.holderName,
      },
    });

    // Save to Supabase payment_methods table
    const { data, error } = await supabase
      .from('payment_methods')
      .insert([{
        user_id: userId,
        type: 'card',
        last4: cardDetails.number.slice(-4),
        brand: paymentMethod.card.brand,
        expiry_month: cardDetails.expiryMonth,
        expiry_year: cardDetails.expiryYear,
        stripe_payment_method_id: paymentMethod.id,
        is_default: false
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save payment method',
        error: 'DATABASE_ERROR'
      });
    }

    res.json({
      success: true,
      message: 'Card added successfully',
      paymentMethod: {
        id: data.id,
        type: data.type,
        last4: data.last4,
        brand: data.brand,
        expiryMonth: data.expiry_month,
        expiryYear: data.expiry_year,
        isDefault: data.is_default,
        stripePaymentMethodId: data.stripe_payment_method_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    });

  } catch (error) {
    console.error('Add card error:', error);
    
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: 'STRIPE_CARD_ERROR'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add card',
      error: 'INTERNAL_ERROR'
    });
  }
});

// Delete payment method
app.delete('/api/payment/delete-method/:methodId', verifyToken, async (req, res) => {
  try {
    const { methodId } = req.params;
    const userId = req.user.id;

    // Get payment method from database
    const { data: paymentMethod, error: fetchError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', methodId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found',
        error: 'NOT_FOUND'
      });
    }

    // Delete from Stripe
    if (paymentMethod.stripe_payment_method_id) {
      try {
        await stripe.paymentMethods.detach(paymentMethod.stripe_payment_method_id);
      } catch (stripeError) {
        console.warn('Stripe deletion failed:', stripeError.message);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', methodId)
      .eq('user_id', userId);

    if (deleteError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete payment method',
        error: 'DATABASE_ERROR'
      });
    }

    res.json({
      success: true,
      message: 'Payment method deleted successfully'
    });

  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment method',
      error: 'INTERNAL_ERROR'
    });
  }
});

// Set default payment method
app.put('/api/payment/set-default/:methodId', verifyToken, async (req, res) => {
  try {
    const { methodId } = req.params;
    const userId = req.user.id;

    // First, unset all default methods for this user
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('user_id', userId);

    // Set the selected method as default
    const { data, error } = await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', methodId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found',
        error: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Default payment method updated',
      paymentMethod: {
        id: data.id,
        type: data.type,
        last4: data.last4,
        brand: data.brand,
        expiryMonth: data.expiry_month,
        expiryYear: data.expiry_year,
        isDefault: data.is_default,
        stripePaymentMethodId: data.stripe_payment_method_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    });

  } catch (error) {
    console.error('Set default payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default payment method',
      error: 'INTERNAL_ERROR'
    });
  }
});

// Process payment for order
app.post('/api/payment/charge', verifyToken, async (req, res) => {
  try {
    const { amount, paymentMethodId, orderId, description } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!amount || !paymentMethodId || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Amount, payment method, and order ID are required',
        error: 'INVALID_INPUT'
      });
    }

    // Get payment method from database
    const { data: paymentMethod, error: fetchError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', paymentMethodId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found',
        error: 'PAYMENT_METHOD_NOT_FOUND'
      });
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethod.stripe_payment_method_id,
      confirm: true,
      description: description || `Payment for order ${orderId}`,
      metadata: {
        orderId,
        userId
      }
    });

    // Save payment record to database
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        user_id: userId,
        order_id: orderId,
        payment_method_id: paymentMethodId,
        stripe_payment_intent_id: paymentIntent.id,
        amount: amount,
        currency: 'usd',
        status: paymentIntent.status,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (paymentError) {
      console.error('Payment record error:', paymentError);
    }

    // Update order status if payment successful
    if (paymentIntent.status === 'succeeded') {
      await supabase
        .from('orders')
        .update({ 
          status: 'confirmed',
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('customer_id', userId);
    }

    res.json({
      success: true,
      message: 'Payment processed successfully',
      payment: {
        id: paymentRecord?.id,
        stripePaymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: amount,
        currency: 'usd'
      }
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: 'PAYMENT_FAILED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Payment processing failed',
      error: 'INTERNAL_ERROR'
    });
  }
});

// Get payment history
app.get('/api/payment/history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        orders (
          order_number,
          total_amount,
          status
        ),
        payment_methods (
          type,
          last4,
          brand
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch payment history',
        error: 'DATABASE_ERROR'
      });
    }

    res.json({
      success: true,
      message: 'Payment history retrieved successfully',
      payments: payments || []
    });

  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: 'INTERNAL_ERROR'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: 'INTERNAL_ERROR'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Payment API server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
