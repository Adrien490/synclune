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
 *
 * Consommée par la chaîne Stripe (PaymentIntent, line items, refunds).
 * Les formatters d'affichage (`shared/utils/format-euro.ts`, PDF facture) et
 * plusieurs gardes hardcodent "EUR" volontairement : mono-devise assumé
 * (cf. `docs/BUSINESS.md`).
 *
 * ⚠️ Le mono-devise est une CONVENTION DE CODE, pas une garantie de base.
 * Il n'existe ni colonne `Order.currency` ni CHECK associé — ce commentaire a
 * longtemps affirmé l'inverse (« verrouillé en DB par le CHECK
 * `Order_currency_eur_check` »), alors que `prisma/sql/raw-guards.sql` ne
 * mentionne pas `currency`. Rien en base ne rejetterait un montant libellé dans
 * une autre devise : la seule chose qui tient l'invariant, c'est que cette
 * constante est l'unique source du champ `currency` envoyé à Stripe.
 *
 * Corollaire : passer au multi-devise ne se résume PAS à décentraliser cette
 * constante — il faudrait d'abord persister la devise par commande (les
 * montants `Int` de `Order`/`OrderItem`/`Refund` sont en unité mineure, dont le
 * facteur dépend de la devise) avant que quoi que ce soit d'autre bouge.
 */
export const DEFAULT_CURRENCY = "EUR" as const;

/**
 * Minimum chargeable amount on Stripe for EUR (in cents).
 * Source: https://docs.stripe.com/currencies#minimum-and-maximum-charge-amounts
 */
export const STRIPE_MIN_AMOUNT_EUR_CENTS = 50;
