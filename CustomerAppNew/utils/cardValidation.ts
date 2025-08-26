/**
 * Card Validation Utilities
 * Provides client-side validation for payment cards
 */

export interface CardValidationResult {
  isValid: boolean;
  cardType: CardType;
  errors: string[];
}

export enum CardType {
  VISA = 'visa',
  MASTERCARD = 'mastercard', 
  AMERICAN_EXPRESS = 'amex',
  DISCOVER = 'discover',
  UNKNOWN = 'unknown'
}

/**
 * Validate credit card number using Luhn algorithm
 */
export function validateCardNumber(cardNumber: string): boolean {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  
  if (!/^\d+$/.test(cleanNumber)) {
    return false;
  }
  
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return false;
  }
  
  return luhnCheck(cleanNumber);
}

/**
 * Luhn algorithm implementation
 */
function luhnCheck(cardNumber: string): boolean {
  let sum = 0;
  let alternate = false;
  
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let n = parseInt(cardNumber.charAt(i), 10);
    
    if (alternate) {
      n *= 2;
      if (n > 9) {
        n = (n % 10) + 1;
      }
    }
    
    sum += n;
    alternate = !alternate;
  }
  
  return (sum % 10) === 0;
}

/**
 * Detect card type based on number
 */
export function detectCardType(cardNumber: string): CardType {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  
  // Visa
  if (/^4/.test(cleanNumber)) {
    return CardType.VISA;
  }
  
  // Mastercard
  if (/^5[1-5]|^2(2[2-9]|[3-6]|7[0-1]|720)/.test(cleanNumber)) {
    return CardType.MASTERCARD;
  }
  
  // American Express
  if (/^3[47]/.test(cleanNumber)) {
    return CardType.AMERICAN_EXPRESS;
  }
  
  // Discover
  if (/^6(011|5)/.test(cleanNumber)) {
    return CardType.DISCOVER;
  }
  
  return CardType.UNKNOWN;
}

/**
 * Validate expiry date
 */
export function validateExpiryDate(expiryDate: string): boolean {
  const match = expiryDate.match(/^(\d{2})\/(\d{2})$/);
  if (!match) {
    return false;
  }
  
  const month = parseInt(match[1], 10);
  const year = parseInt(match[2], 10) + 2000;
  
  if (month < 1 || month > 12) {
    return false;
  }
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return false;
  }
  
  return true;
}

/**
 * Validate CVV
 */
export function validateCVV(cvv: string, cardType: CardType): boolean {
  if (!/^\d+$/.test(cvv)) {
    return false;
  }
  
  if (cardType === CardType.AMERICAN_EXPRESS) {
    return cvv.length === 4;
  } else {
    return cvv.length === 3;
  }
}

/**
 * Format card number with spaces
 */
export function formatCardNumber(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  const cardType = detectCardType(cleanNumber);
  
  if (cardType === CardType.AMERICAN_EXPRESS) {
    return cleanNumber.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
  } else {
    return cleanNumber.replace(/(\d{4})/g, '$1 ').trim();
  }
}

/**
 * Comprehensive card validation
 */
export function validateCard(
  cardNumber: string, 
  expiryDate: string, 
  cvv: string, 
  holderName: string
): CardValidationResult {
  const errors: string[] = [];
  const cardType = detectCardType(cardNumber);
  
  // Validate card number
  if (!validateCardNumber(cardNumber)) {
    errors.push('Invalid card number');
  }
  
  // Validate expiry date
  if (!validateExpiryDate(expiryDate)) {
    errors.push('Invalid expiry date');
  }
  
  // Validate CVV
  if (!validateCVV(cvv, cardType)) {
    if (cardType === CardType.AMERICAN_EXPRESS) {
      errors.push('CVV must be 4 digits for American Express');
    } else {
      errors.push('CVV must be 3 digits');
    }
  }
  
  // Validate holder name
  if (!holderName.trim()) {
    errors.push('Cardholder name is required');
  }
  
  return {
    isValid: errors.length === 0,
    cardType,
    errors
  };
}

/**
 * Get card type icon name for UI
 */
export function getCardIcon(cardType: CardType): string {
  switch (cardType) {
    case CardType.VISA:
      return 'credit-card'; // or specific visa icon
    case CardType.MASTERCARD:
      return 'credit-card'; // or specific mastercard icon
    case CardType.AMERICAN_EXPRESS:
      return 'credit-card'; // or specific amex icon
    case CardType.DISCOVER:
      return 'credit-card'; // or specific discover icon
    default:
      return 'credit-card';
  }
}

/**
 * Mask card number for display (show only last 4 digits)
 */
export function maskCardNumber(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  if (cleanNumber.length < 4) {
    return '*'.repeat(cleanNumber.length);
  }
  
  const lastFour = cleanNumber.slice(-4);
  const maskedPart = '*'.repeat(cleanNumber.length - 4);
  
  return `${maskedPart}${lastFour}`;
}
