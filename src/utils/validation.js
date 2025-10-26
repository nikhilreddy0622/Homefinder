/**
 * Validation utility functions
 */

export const validateEmail = (email) => {
  if (!email) return false;
  if (!/\S+@\S+\.\S+/.test(email)) return false;
  return true;
};

export const validatePassword = (password) => {
  if (!password) return false;
  if (password.length < 6) return false;
  return true;
};

export const validateName = (name) => {
  if (!name) return false;
  if (name.length < 2) return false;
  return true;
};

export const validateRequired = (value, fieldName = 'Field') => {
  if (!value) return false;
  return true;
};

export const validateNumber = (value, fieldName = 'Number') => {
  if (!value) return false;
  if (isNaN(value) || value <= 0) return false;
  return true;
};

export const validatePhone = (phone) => {
  if (!phone) return false;
  if (!/^\+?[\d\s\-\(\)]{10,}$/.test(phone)) return false;
  return true;
};

export const validateDate = (date) => {
  if (!date) return false;
  if (isNaN(new Date(date).getTime())) return false;
  return true;
};

export const validatePrice = (price) => {
  return validateNumber(price, 'Price');
};

export const validateArea = (area) => {
  return validateNumber(area, 'Area');
};