/**
 * Currency constants - Centralized currency configuration
 * Used across the application for consistent currency handling
 */

// ============================================================================
// CURRENCY CONFIGURATION
// ============================================================================

/**
 * Default currency code for the application
 * ISO 4217 currency code
 */
export const DEFAULT_CURRENCY = "EUR" as const;

/**
 * Divisor to convert cents to euros
 * Amounts are stored in cents in the database (Stripe standard)
 *
 * @example
 * const priceInEuros = priceInCents / CURRENCY_DIVISOR; // 1500 -> 15.00
 */
export const CURRENCY_DIVISOR = 100;

/**
 * Currency symbol for display
 */
export const CURRENCY_SYMBOL = "\u20AC" as const; // Euro sign

/**
 * Currency locale for formatting
 */
export const CURRENCY_LOCALE = "fr-FR" as const;
