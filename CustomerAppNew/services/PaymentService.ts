/**
 * PaymentService - Real payment integration with Stripe and Supabase
 * Handles credit cards, payment methods, and transactions
 */

import { createClient } from '@supabase/supabase-js';
import { authService } from '../AuthServiceSupabase';

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  email?: string;
  stripePaymentMethodId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CardDetails {
  number: string;
  expiryMonth: number;
  expiryYear: number;
  cvc: string;
  holderName: string;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  paymentMethod?: PaymentMethod;
  error?: string;
}

class PaymentService {
  private currentUserId: string | null = null;

  constructor() {
    this.initializeUser();
  }

  private async initializeUser() {
    try {
      const currentUser = await authService.getCurrentUser();
      this.currentUserId = currentUser?.id || null;
    } catch (error) {
      console.error('Error initializing user for PaymentService:', error);
      this.currentUserId = null;
    }
  }

  // Validate card number using Luhn algorithm
  static validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\s/g, '');
    
    // Check if it's all digits and has valid length
    if (!/^\d{13,19}$/.test(cleaned)) {
      return false;
    }

    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  // Detect card brand from number
  static detectCardBrand(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s/g, '');
    
    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'discover';
    
    return 'unknown';
  }

  // Get auth token for API calls
  private async getAuthToken(): Promise<string> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.access_token) {
        throw new Error('No valid session found');
      }
      return session.access_token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw new Error('Authentication required');
    }
  }

  // Get current user's payment methods from Supabase payment_methods table
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      await this.initializeUser();
      
      if (!this.currentUserId) {
        return [];
      }

      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', this.currentUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payment methods:', error);
        return [];
      }

      return data.map(method => ({
        id: method.id,
        type: method.type,
        last4: method.last4,
        brand: method.brand,
        expiryMonth: method.expiry_month,
        expiryYear: method.expiry_year,
        isDefault: method.is_default,
        email: method.email,
        stripePaymentMethodId: method.stripe_payment_method_id,
        createdAt: method.created_at,
        updatedAt: method.updated_at
      }));
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }
  }

  // Add credit/debit card via Supabase Edge Function
  async addCard(cardDetails: CardDetails): Promise<PaymentResponse> {
    try {
      await this.initializeUser();
      
      if (!this.currentUserId) {
        return {
          success: false,
          message: 'User not authenticated',
          error: 'AUTHENTICATION_REQUIRED'
        };
      }

      // Call Supabase Edge Function with correct endpoint URL
      const response = await fetch(`${supabaseUrl}/functions/v1/rapid-function`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          action: 'add-card',
          cardDetails,
          userId: this.currentUserId
        })
      });

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('Error adding card:', error);
      return {
        success: false,
        message: error.message || 'Failed to add card',
        error: error.code || 'NETWORK_ERROR'
      };
    }
  }

  // Add PayPal payment method to payment_methods table
  async addPayPal(email: string): Promise<PaymentResponse> {
    try {
      await this.initializeUser();
      
      if (!this.currentUserId) {
        return {
          success: false,
          message: 'User not authenticated',
          error: 'AUTHENTICATION_REQUIRED'
        };
      }

      const { data, error } = await supabase
        .from('payment_methods')
        .insert([{
          user_id: this.currentUserId,
          type: 'paypal',
          email: email,
          is_default: false
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: 'PayPal account added successfully',
        paymentMethod: {
          id: data.id,
          type: 'paypal',
          email: data.email,
          isDefault: data.is_default,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
      };
    } catch (error: any) {
      console.error('Error adding PayPal:', error);
      return {
        success: false,
        message: error.message || 'Failed to add PayPal',
        error: error.code || 'UNKNOWN_ERROR'
      };
    }
  }

  // Process payment for orders via Supabase Edge Function
  async processPayment(amount: number, paymentMethodId: string, orderId: string): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/rapid-function`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          action: 'process-payment',
          amount,
          paymentMethodId,
          orderId
        })
      });

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        message: 'Payment processing failed',
        error: error.code || 'NETWORK_ERROR'
      };
    }
  }

  // Remove payment method from Supabase
  async removePaymentMethod(paymentMethodId: string): Promise<PaymentResponse> {
    try {
      await this.initializeUser();
      
      if (!this.currentUserId) {
        return {
          success: false,
          message: 'User not authenticated',
          error: 'AUTHENTICATION_REQUIRED'
        };
      }

      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', paymentMethodId)
        .eq('user_id', this.currentUserId);

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: 'Payment method removed successfully'
      };
    } catch (error: any) {
      console.error('Error removing payment method:', error);
      return {
        success: false,
        message: error.message || 'Failed to remove payment method',
        error: error.code || 'UNKNOWN_ERROR'
      };
    }
  }

  // Set default payment method
  async setDefaultPaymentMethod(paymentMethodId: string): Promise<PaymentResponse> {
    try {
      await this.initializeUser();
      
      if (!this.currentUserId) {
        return {
          success: false,
          message: 'User not authenticated',
          error: 'AUTHENTICATION_REQUIRED'
        };
      }

      // First, unset all current default methods for this user
      const { error: unsetError } = await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', this.currentUserId);

      if (unsetError) {
        throw unsetError;
      }

      // Then set the selected method as default
      const { error: setError } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', paymentMethodId)
        .eq('user_id', this.currentUserId);

      if (setError) {
        throw setError;
      }

      return {
        success: true,
        message: 'Default payment method updated successfully'
      };
    } catch (error: any) {
      console.error('Error setting default payment method:', error);
      return {
        success: false,
        message: error.message || 'Failed to set default payment method',
        error: error.code || 'UNKNOWN_ERROR'
      };
    }
  }
}

// Export both the class and instance
export { PaymentService };
export const paymentService = new PaymentService();
export default paymentService;
