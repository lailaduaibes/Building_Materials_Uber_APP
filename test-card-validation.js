// Test the validateCardNumber function
function validateCardNumber(cardNumber: string): boolean {
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

// Test with known valid card numbers
const testCards = [
  '4532015112830366', // Valid Visa test card
  '4532 0151 1283 0366', // Same card with spaces
  '5555555555554444', // Valid Mastercard test card
  '378282246310005', // Valid Amex test card
  '1234567890123456', // Invalid card
  '4532015112830367', // Invalid Visa (last digit changed)
];

testCards.forEach(card => {
  const result = validateCardNumber(card);
  console.log(`Card: ${card} - Valid: ${result}`);
});
