/**
 * StripeService - Real Stripe integration for bank account verification
 * Handles micro-deposits, account verification, and payment processing
 */

import { Alert } from 'react-native';
import Constants from 'expo-constants';

// Get Stripe keys from environment variables or Expo config
const STRIPE_SECRET_KEY = Constants.expoConfig?.extra?.stripeSecretKey || process.env.STRIPE_SECRET_KEY || 'sk_test_...';
const STRIPE_PUBLISHABLE_KEY = Constants.expoConfig?.extra?.stripePublishableKey || process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_...';

export interface StripeCustomer {
  id: string;
  email: string;
  name: string;
}

export interface StripeBankAccount {
  id: string;
  object: 'bank_account';
  account_holder_name: string;
  account_holder_type: 'individual' | 'company';
  bank_name: string;
  country: string;
  currency: string;
  fingerprint: string;
  last4: string;
  routing_number: string;
  status: 'new' | 'validated' | 'verified' | 'verification_failed' | 'errored';
}

export interface MicroDepositVerification {
  amounts: number[];
  status: 'pending' | 'succeeded' | 'failed';
  attempts_remaining: number;
}

class StripeService {
  private baseUrl = 'https://api.stripe.com/v1';

  /**
   * Create or get Stripe customer for driver
   */
  async createOrGetCustomer(driverId: string, email: string, name: string): Promise<StripeCustomer | null> {
    try {
      const response = await fetch(`${this.baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email,
          name,
          metadata: JSON.stringify({ driver_id: driverId }),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Stripe customer');
      }

      const customer = await response.json();
      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      return null;
    }
  }

  /**
   * Add bank account to Stripe customer and initiate verification
   */
  async addBankAccount(
    customerId: string,
    accountNumber: string,
    routingNumber: string,
    accountHolderName: string,
    accountType: 'checking' | 'savings'
  ): Promise<StripeBankAccount | null> {
    try {
      const response = await fetch(`${this.baseUrl}/customers/${customerId}/sources`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          source: await this.createBankAccountToken(accountNumber, routingNumber, accountHolderName, accountType),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add bank account to Stripe');
      }

      const bankAccount = await response.json();

      // Initiate micro-deposit verification
      await this.initiateMicroDepositVerification(customerId, bankAccount.id);

      return bankAccount;
    } catch (error) {
      console.error('Error adding bank account to Stripe:', error);
      Alert.alert('Error', 'Failed to add bank account. Please check your details and try again.');
      return null;
    }
  }

  /**
   * Create bank account token for secure transmission
   */
  private async createBankAccountToken(
    accountNumber: string,
    routingNumber: string,
    accountHolderName: string,
    accountType: 'checking' | 'savings'
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_PUBLISHABLE_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'bank_account[country]': 'US',
        'bank_account[currency]': 'usd',
        'bank_account[account_holder_name]': accountHolderName,
        'bank_account[account_holder_type]': 'individual',
        'bank_account[routing_number]': routingNumber,
        'bank_account[account_number]': accountNumber,
        'bank_account[account_type]': accountType,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create bank account token');
    }

    const token = await response.json();
    return token.id;
  }

  /**
   * Initiate micro-deposit verification
   */
  async initiateMicroDepositVerification(customerId: string, bankAccountId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/customers/${customerId}/sources/${bankAccountId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to initiate micro-deposit verification');
      }

      Alert.alert(
        'Verification Initiated',
        'We\'re sending 2 small deposits to your bank account. This typically takes 1-2 business days. Please check your bank statement and return here to complete verification.'
      );

      return true;
    } catch (error) {
      console.error('Error initiating micro-deposit verification:', error);
      Alert.alert('Error', 'Failed to initiate verification. Please try again.');
      return false;
    }
  }

  /**
   * Verify micro-deposit amounts
   */
  async verifyMicroDeposits(
    customerId: string,
    bankAccountId: string,
    amount1: number,
    amount2: number
  ): Promise<boolean> {
    try {
      // Convert dollars to cents for Stripe API
      const amount1Cents = Math.round(amount1 * 100);
      const amount2Cents = Math.round(amount2 * 100);

      const response = await fetch(`${this.baseUrl}/customers/${customerId}/sources/${bankAccountId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amounts: `${amount1Cents},${amount2Cents}`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.error?.code === 'bank_account_verification_failed') {
          Alert.alert(
            'Verification Failed',
            'The amounts you entered don\'t match our records. Please check your bank statement and try again.'
          );
        } else {
          throw new Error('Verification failed');
        }
        return false;
      }

      Alert.alert(
        'Verification Complete!',
        'Your bank account has been successfully verified. You can now receive payouts.'
      );

      return true;
    } catch (error) {
      console.error('Error verifying micro-deposits:', error);
      Alert.alert('Error', 'Failed to verify bank account. Please try again.');
      return false;
    }
  }

  /**
   * Get bank account verification status
   */
  async getBankAccountStatus(customerId: string, bankAccountId: string): Promise<MicroDepositVerification | null> {
    try {
      const response = await fetch(`${this.baseUrl}/customers/${customerId}/sources/${bankAccountId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get bank account status');
      }

      const bankAccount = await response.json();
      
      return {
        amounts: [], // Stripe doesn't return the actual amounts for security
        status: bankAccount.status === 'verified' ? 'succeeded' : 
                bankAccount.status === 'verification_failed' ? 'failed' : 'pending',
        attempts_remaining: 3, // Stripe typically allows 3 attempts
      };
    } catch (error) {
      console.error('Error getting bank account status:', error);
      return null;
    }
  }

  /**
   * Process payout to verified bank account
   */
  async processPayoutToBank(
    bankAccountId: string,
    amount: number,
    currency: string = 'usd',
    description: string = 'Driver payout'
  ): Promise<boolean> {
    try {
      const amountCents = Math.round(amount * 100);

      const response = await fetch(`${this.baseUrl}/transfers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: amountCents.toString(),
          currency,
          destination: bankAccountId,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process payout');
      }

      return true;
    } catch (error) {
      console.error('Error processing payout:', error);
      return false;
    }
  }

  /**
   * Handle Stripe webhooks for verification status updates
   */
  async handleWebhook(event: any): Promise<void> {
    switch (event.type) {
      case 'source.chargeable':
        // Bank account has been verified
        await this.updateBankAccountVerificationStatus(event.data.object.id, 'verified');
        break;
      
      case 'source.failed':
        // Bank account verification failed
        await this.updateBankAccountVerificationStatus(event.data.object.id, 'failed');
        break;
      
      case 'source.canceled':
        // Verification was canceled
        await this.updateBankAccountVerificationStatus(event.data.object.id, 'canceled');
        break;
    }
  }

  /**
   * Update verification status in database
   */
  private async updateBankAccountVerificationStatus(stripeSourceId: string, status: string): Promise<void> {
    // This would update your Supabase database
    // Implementation depends on your database structure
    console.log(`Updating bank account ${stripeSourceId} status to ${status}`);
  }
}

export const stripeService = new StripeService();
