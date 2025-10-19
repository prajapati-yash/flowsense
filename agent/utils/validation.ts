/**
 * Input Validation Utilities
 * Provides validation functions for various input types
 */

import { ValidationError } from '../types';

/**
 * Validate Flow blockchain address
 * @param address - Address to validate
 * @returns True if valid
 * @throws ValidationError if invalid
 */
export function validateFlowAddress(address: string): true {
  // Check if address is a string
  if (typeof address !== 'string') {
    throw new ValidationError('Address must be a string');
  }

  // Trim whitespace
  const trimmed = address.trim();

  // Check if address starts with 0x
  if (!trimmed.startsWith('0x')) {
    throw new ValidationError('Flow address must start with 0x');
  }

  // Check length (0x + 16 hex characters = 18)
  if (trimmed.length !== 18) {
    throw new ValidationError(
      'Flow address must be 18 characters (0x followed by 16 hex characters)'
    );
  }

  // Check if valid hexadecimal
  if (!/^0x[a-f0-9]{16}$/i.test(trimmed)) {
    throw new ValidationError(
      'Flow address must contain only hexadecimal characters (0-9, a-f)'
    );
  }

  return true;
}

/**
 * Check if Flow address is valid (non-throwing version)
 * @param address - Address to check
 * @returns True if valid, false otherwise
 */
export function isValidFlowAddress(address: string): boolean {
  try {
    validateFlowAddress(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate amount (must be positive number)
 * @param amount - Amount to validate
 * @param fieldName - Name of the field (for error message)
 * @returns True if valid
 * @throws ValidationError if invalid
 */
export function validateAmount(amount: unknown, fieldName: string = 'Amount'): true {
  // Check if it's a number
  if (typeof amount !== 'number') {
    throw new ValidationError(`${fieldName} must be a number`);
  }

  // Check if it's a valid number (not NaN or Infinity)
  if (!Number.isFinite(amount)) {
    throw new ValidationError(`${fieldName} must be a finite number`);
  }

  // Check if positive
  if (amount <= 0) {
    throw new ValidationError(`${fieldName} must be positive`);
  }

  return true;
}

/**
 * Check if amount is valid (non-throwing version)
 * @param amount - Amount to check
 * @returns True if valid, false otherwise
 */
export function isValidAmount(amount: unknown): boolean {
  try {
    validateAmount(amount);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate slippage percentage
 * @param slippage - Slippage to validate (0-100)
 * @returns True if valid
 * @throws ValidationError if invalid
 */
export function validateSlippage(slippage: number): true {
  validateAmount(slippage, 'Slippage');

  if (slippage < 0 || slippage > 100) {
    throw new ValidationError('Slippage must be between 0 and 100 percent');
  }

  // Warn if slippage is very high
  if (slippage > 50) {
    console.warn(`Warning: High slippage of ${slippage}% may result in unfavorable trades`);
  }

  return true;
}

/**
 * Validate token symbol
 * @param symbol - Token symbol to validate
 * @returns True if valid
 * @throws ValidationError if invalid
 */
export function validateTokenSymbol(symbol: unknown): true {
  if (typeof symbol !== 'string') {
    throw new ValidationError('Token symbol must be a string');
  }

  const trimmed = symbol.trim();

  if (trimmed.length === 0) {
    throw new ValidationError('Token symbol cannot be empty');
  }

  if (trimmed.length > 20) {
    throw new ValidationError('Token symbol is too long (max 20 characters)');
  }

  // Check for valid characters (letters, numbers, dash, underscore)
  if (!/^[a-z0-9_-]+$/i.test(trimmed)) {
    throw new ValidationError(
      'Token symbol must contain only letters, numbers, dash, or underscore'
    );
  }

  return true;
}

/**
 * Validate string is not empty
 * @param value - Value to validate
 * @param fieldName - Name of the field
 * @returns True if valid
 * @throws ValidationError if invalid
 */
export function validateNonEmptyString(value: unknown, fieldName: string): true {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  if (value.trim().length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }

  return true;
}

/**
 * Validate number is within range
 * @param value - Value to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param fieldName - Name of the field
 * @returns True if valid
 * @throws ValidationError if invalid
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string = 'Value'
): true {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }

  if (value < min || value > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max}`);
  }

  return true;
}

/**
 * Validate enum value
 * @param value - Value to validate
 * @param allowedValues - Array of allowed values
 * @param fieldName - Name of the field
 * @returns True if valid
 * @throws ValidationError if invalid
 */
export function validateEnum(
  value: unknown,
  allowedValues: string[],
  fieldName: string = 'Value'
): true {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`
    );
  }

  return true;
}

/**
 * Sanitize user input to prevent injection attacks
 * @param input - User input to sanitize
 * @returns Sanitized input
 */
export function sanitizeInput(input: string): string {
  // Remove any control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length to prevent DoS
  const MAX_LENGTH = 1000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }

  return sanitized;
}

/**
 * Validate conversation ID format
 * @param conversationId - Conversation ID to validate
 * @returns True if valid
 * @throws ValidationError if invalid
 */
export function validateConversationId(conversationId: string): true {
  if (typeof conversationId !== 'string') {
    throw new ValidationError('Conversation ID must be a string');
  }

  // Must be a valid UUID v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(conversationId)) {
    throw new ValidationError('Invalid conversation ID format');
  }

  return true;
}

/**
 * Format Flow address (ensure proper format)
 * @param address - Address to format
 * @returns Formatted address
 */
export function formatFlowAddress(address: string): string {
  const trimmed = address.trim().toLowerCase();

  // Add 0x prefix if missing
  if (!trimmed.startsWith('0x')) {
    return '0x' + trimmed;
  }

  return trimmed;
}

/**
 * Format amount to UFix64 string (Flow's decimal type)
 * @param amount - Amount to format
 * @param decimals - Number of decimal places (default: 8)
 * @returns Formatted amount string
 */
export function formatAmount(amount: number, decimals: number = 8): string {
  validateAmount(amount);

  // Ensure we have decimal places
  return amount.toFixed(decimals);
}

/**
 * Parse amount from string
 * @param amountStr - Amount string
 * @returns Parsed number
 * @throws ValidationError if invalid
 */
export function parseAmount(amountStr: string): number {
  const parsed = parseFloat(amountStr);

  if (isNaN(parsed)) {
    throw new ValidationError(`Invalid amount: ${amountStr}`);
  }

  validateAmount(parsed);

  return parsed;
}

/**
 * Validate object has required fields
 * @param obj - Object to validate
 * @param requiredFields - Array of required field names
 * @returns True if valid
 * @throws ValidationError if invalid
 */
export function validateRequiredFields(
  obj: Record<string, unknown>,
  requiredFields: string[]
): true {
  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
      throw new ValidationError(`Missing required field: ${field}`);
    }
  }

  return true;
}

/**
 * Validate timeout value
 * @param timeout - Timeout in milliseconds
 * @returns True if valid
 * @throws ValidationError if invalid
 */
export function validateTimeout(timeout: number): true {
  validateAmount(timeout, 'Timeout');

  // Reasonable limits: 1 second to 5 minutes
  validateRange(timeout, 1000, 300000, 'Timeout');

  return true;
}

/**
 * Validate temperature for LLM
 * @param temperature - Temperature value (0-1)
 * @returns True if valid
 * @throws ValidationError if invalid
 */
export function validateTemperature(temperature: number): true {
  if (typeof temperature !== 'number' || !Number.isFinite(temperature)) {
    throw new ValidationError('Temperature must be a valid number');
  }

  validateRange(temperature, 0, 1, 'Temperature');

  return true;
}
