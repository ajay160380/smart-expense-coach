/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — CLIENT-SIDE FORM VALIDATION (ITEM 7)
 * Ensures robust pre-flight checks before hitting backend APIs.
 * ═══════════════════════════════════════════════════════════════
 */

export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'Username is required.' };
  }
  const clean = username.trim();
  if (clean.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters.' };
  }
  if (clean.length > 25) {
    return { isValid: false, error: 'Username cannot exceed 25 characters.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, and underscores.' };
  }
  return { isValid: true, value: clean };
}

export function validateEmail(email, isRequired = true) {
  if (!email || typeof email !== 'string') {
    if (!isRequired) return { isValid: true, value: '' };
    return { isValid: false, error: 'Email address is required.' };
  }
  const clean = email.trim().toLowerCase();
  if (!clean && !isRequired) {
    return { isValid: true, value: '' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clean)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g., name@domain.com).' };
  }
  return { isValid: true, value: clean };
}

export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is required.' };
  }
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length < 10 || clean.length > 15) {
    return { isValid: false, error: 'Phone number must be between 10 and 15 digits.' };
  }
  return { isValid: true, value: clean };
}

export function validatePassword(password, confirmPassword = null) {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required.' };
  }
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long.' };
  }
  if (confirmPassword !== null && password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match.' };
  }
  return { isValid: true, value: password };
}

export function validateAmount(amount, maxAmount = 10000000) {
  if (amount === undefined || amount === null || amount === '') {
    return { isValid: false, error: 'Amount is required.' };
  }
  const num = parseFloat(String(amount).replace(/[^0-9.]/g, ''));
  if (isNaN(num) || num <= 0) {
    return { isValid: false, error: 'Please enter a valid amount greater than 0.' };
  }
  if (num > maxAmount) {
    return { isValid: false, error: `Amount cannot exceed ₹${maxAmount.toLocaleString('en-IN')}.` };
  }
  return { isValid: true, value: num };
}

export function validateSavingsGoal(name, targetAmount) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return { isValid: false, error: 'Goal title is required (e.g. New Laptop, Goa Trip).' };
  }
  const amountCheck = validateAmount(targetAmount);
  if (!amountCheck.isValid) {
    return { isValid: false, error: `Goal Target: ${amountCheck.error}` };
  }
  return { isValid: true, name: name.trim(), targetAmount: amountCheck.value };
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

export function sanitizeAmount(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
}
