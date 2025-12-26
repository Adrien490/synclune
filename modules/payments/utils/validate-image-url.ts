/**
 * P1.3: Validation des URLs d'images avant envoi à Stripe
 *
 * Re-export depuis shared/lib/media-validation.ts pour
 * maintenir la rétrocompatibilité des imports existants.
 */
export { isValidImageUrl, getValidImageUrl } from "@/shared/lib/media-validation"
