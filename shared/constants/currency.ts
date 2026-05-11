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
 * Minimum chargeable amount on Stripe for EUR (in cents).
 * Source: https://docs.stripe.com/currencies#minimum-and-maximum-charge-amounts
 */
export const STRIPE_MIN_AMOUNT_EUR_CENTS = 50;
