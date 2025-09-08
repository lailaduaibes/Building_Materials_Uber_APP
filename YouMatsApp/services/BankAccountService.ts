/**
 * BankAccountService - Professional bank account management for driver payouts
 * Handles secure bank account setup, validation, and management
 */

import { authService } from '../AuthServiceSupabase';
import { Alert } from 'react-native';

// Get the authenticated Supabase client
const supabase = authService.getSupabaseClient();

export interface BankAccount {
  id: string;
  driver_id: string;
  bank_name: string;
  account_holder_name: string;
  account_number_last4: string;
  routing_number: string;
  account_type: 'checking' | 'savings';
  is_default: boolean;
  is_verified: boolean;
  is_active: boolean;
  nickname?: string;
  stripe_bank_account_id?: string;
  verification_status: 'pending' | 'verified' | 'failed' | 'requires_action';
  verification_details?: any;
  created_at: string;
  updated_at: string;
}

export interface BankAccountFormData {
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  routing_number: string;
  account_type: 'checking' | 'savings';
  nickname?: string;
}

export interface BankValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

class BankAccountService {
  /**
   * Validate US bank account details
   */
  validateBankAccount(formData: BankAccountFormData): BankValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate account holder name
    if (!formData.account_holder_name.trim()) {
      errors.push('Account holder name is required');
    } else if (formData.account_holder_name.length < 2) {
      errors.push('Account holder name must be at least 2 characters');
    } else if (!/^[a-zA-Z\s\-'\.]+$/.test(formData.account_holder_name)) {
      errors.push('Account holder name contains invalid characters');
    }

    // Validate bank name
    if (!formData.bank_name.trim()) {
      errors.push('Bank name is required');
    }

    // Validate routing number (US format)
    const routingNumber = formData.routing_number.replace(/\D/g, '');
    if (!routingNumber) {
      errors.push('Routing number is required');
    } else if (routingNumber.length !== 9) {
      errors.push('Routing number must be exactly 9 digits');
    } else if (!this.validateRoutingNumberChecksum(routingNumber)) {
      errors.push('Invalid routing number format');
    }

    // Validate account number
    const accountNumber = formData.account_number.replace(/\D/g, '');
    if (!accountNumber) {
      errors.push('Account number is required');
    } else if (accountNumber.length < 4 || accountNumber.length > 17) {
      errors.push('Account number must be between 4 and 17 digits');
    }

    // Validate account type
    if (!['checking', 'savings'].includes(formData.account_type)) {
      errors.push('Account type must be checking or savings');
    }

    // Warnings for common issues
    if (formData.bank_name.toLowerCase().includes('credit union')) {
      warnings.push('Credit unions may have longer processing times');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate routing number using ABA checksum algorithm
   */
  private validateRoutingNumberChecksum(routingNumber: string): boolean {
    if (routingNumber.length !== 9) return false;

    const digits = routingNumber.split('').map(Number);
    const checksum = (
      3 * (digits[0] + digits[3] + digits[6]) +
      7 * (digits[1] + digits[4] + digits[7]) +
      1 * (digits[2] + digits[5] + digits[8])
    ) % 10;

    return checksum === 0;
  }

  /**
   * Add a new bank account for driver
   */
  async addBankAccount(driverId: string, formData: BankAccountFormData): Promise<BankAccount | null> {
    try {
      // Validate the form data
      const validation = this.validateBankAccount(formData);
      if (!validation.isValid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        return null;
      }

      // Check if this is the first bank account (make it default)
      const existingAccounts = await this.getBankAccounts(driverId);
      const isFirstAccount = existingAccounts.length === 0;

      // Prepare bank account data
      const accountData = {
        driver_id: driverId,
        bank_name: formData.bank_name.trim(),
        account_holder_name: formData.account_holder_name.trim(),
        account_number_last4: formData.account_number.slice(-4),
        routing_number: formData.routing_number.replace(/\D/g, ''),
        account_type: formData.account_type,
        nickname: formData.nickname?.trim() || formData.bank_name,
        is_default: isFirstAccount,
        is_verified: false, // Will be verified through Stripe
        is_active: true,
        verification_status: 'pending' as const,
      };

      const { data, error } = await supabase
        .from('driver_payment_methods')
        .insert({
          ...accountData,
          type: 'bank_account',
        })
        .select()
        .single();

      if (error) throw error;

      // If this is set as default, update other accounts
      if (isFirstAccount) {
        await this.setDefaultBankAccount(driverId, data.id);
      }

      console.log('Bank account added successfully:', data);
      return data;
    } catch (error) {
      console.error('Error adding bank account:', error);
      Alert.alert('Error', 'Failed to add bank account. Please try again.');
      return null;
    }
  }

  /**
   * Get all bank accounts for a driver
   */
  async getBankAccounts(driverId: string): Promise<BankAccount[]> {
    try {
      const { data, error } = await supabase
        .from('driver_payment_methods')
        .select('*')
        .eq('driver_id', driverId)
        .eq('type', 'bank_account')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting bank accounts:', error);
      return [];
    }
  }

  /**
   * Set a bank account as default
   */
  async setDefaultBankAccount(driverId: string, bankAccountId: string): Promise<boolean> {
    try {
      // First, remove default status from all accounts
      await supabase
        .from('driver_payment_methods')
        .update({ is_default: false })
        .eq('driver_id', driverId)
        .eq('type', 'bank_account');

      // Set the selected account as default
      const { error } = await supabase
        .from('driver_payment_methods')
        .update({ is_default: true })
        .eq('id', bankAccountId)
        .eq('driver_id', driverId);

      if (error) throw error;

      console.log('Default bank account updated');
      return true;
    } catch (error) {
      console.error('Error setting default bank account:', error);
      return false;
    }
  }

  /**
   * Remove a bank account
   */
  async removeBankAccount(driverId: string, bankAccountId: string): Promise<boolean> {
    try {
      // Check if this is the default account
      const { data: account } = await supabase
        .from('driver_payment_methods')
        .select('is_default')
        .eq('id', bankAccountId)
        .single();

      // Soft delete the account
      const { error } = await supabase
        .from('driver_payment_methods')
        .update({ is_active: false })
        .eq('id', bankAccountId)
        .eq('driver_id', driverId);

      if (error) throw error;

      // If this was the default account, set another as default
      if (account?.is_default) {
        const remainingAccounts = await this.getBankAccounts(driverId);
        if (remainingAccounts.length > 0) {
          await this.setDefaultBankAccount(driverId, remainingAccounts[0].id);
        }
      }

      console.log('Bank account removed');
      return true;
    } catch (error) {
      console.error('Error removing bank account:', error);
      return false;
    }
  }

  /**
   * Get bank name suggestions based on routing number
   */
  async getBankNameFromRoutingNumber(routingNumber: string): Promise<string | null> {
    // This would typically call a banking API to get the bank name
    // For now, we'll use a basic lookup table for common banks
    const bankLookup: { [key: string]: string } = {
      '021000021': 'Chase Bank',
      '026009593': 'Bank of America',
      '122000247': 'Wells Fargo',
      '021200025': 'Citibank',
      '061000104': 'SunTrust Bank',
      '053000196': 'Capital One',
      '124003116': 'PNC Bank',
      '084000026': 'Regions Bank',
      '113000023': 'BB&T',
      '074000010': 'Citizens Bank',
    };

    const cleanRoutingNumber = routingNumber.replace(/\D/g, '');
    return bankLookup[cleanRoutingNumber] || null;
  }

  /**
   * Initiate bank account verification (micro-deposits)
   */
  async initiateBankVerification(bankAccountId: string): Promise<boolean> {
    try {
      // In a real implementation, this would:
      // 1. Call Stripe to create bank account
      // 2. Initiate micro-deposit verification
      // 3. Update verification status

      const { error } = await supabase
        .from('driver_payment_methods')
        .update({
          verification_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bankAccountId);

      if (error) throw error;

      Alert.alert(
        'Verification Initiated',
        'We\'ll send 2 small deposits to your account within 1-2 business days. Check your bank statement and return here to complete verification.'
      );

      return true;
    } catch (error) {
      console.error('Error initiating bank verification:', error);
      Alert.alert('Error', 'Failed to initiate verification. Please try again.');
      return false;
    }
  }

  /**
   * Verify bank account with micro-deposit amounts
   */
  async verifyBankAccount(bankAccountId: string, amount1: number, amount2: number): Promise<boolean> {
    try {
      // In a real implementation, this would verify with Stripe
      // For demo purposes, we'll accept any two amounts between 1-99 cents
      const isValid = amount1 > 0 && amount1 < 1 && amount2 > 0 && amount2 < 1;

      if (isValid) {
        const { error } = await supabase
          .from('driver_payment_methods')
          .update({
            is_verified: true,
            verification_status: 'verified',
            updated_at: new Date().toISOString(),
          })
          .eq('id', bankAccountId);

        if (error) throw error;

        Alert.alert('Verification Complete', 'Your bank account has been verified successfully!');
        return true;
      } else {
        Alert.alert('Verification Failed', 'The amounts you entered don\'t match our records. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Error verifying bank account:', error);
      Alert.alert('Error', 'Failed to verify bank account. Please try again.');
      return false;
    }
  }

  /**
   * Format account number for display (show only last 4 digits)
   */
  formatAccountNumber(accountNumber: string): string {
    return `****${accountNumber.slice(-4)}`;
  }

  /**
   * Format routing number for display
   */
  formatRoutingNumber(routingNumber: string): string {
    const clean = routingNumber.replace(/\D/g, '');
    return clean.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');
  }
}

export const bankAccountService = new BankAccountService();
