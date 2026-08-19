// ============================================================================
// LIMITS
// ============================================================================

/**
 * Nombre maximum de favoris.
 *
 * La wishlist vit entièrement dans le cookie `wishlist` (JSON array de
 * Product IDs) depuis le retrait de la base (2026-08-03). Un cookie est
 * plafonné à ~4096 octets nom + valeur compris : 100 cuid2 de 24 caractères
 * sérialisés en JSON ≈ 2,7 Ko, marge confortable. Ne pas relever sans
 * recalculer cette borne.
 */
export const WISHLIST_MAX_ITEMS = 100;

// ============================================================================
// EXPIRATION
// ============================================================================

/**
 * Durée de vie du cookie `wishlist` (jours, glissants — le maxAge est reposé
 * en entier à chaque mutation).
 *
 * ⚠️ La page confidentialité annonce cette durée (tableau de rétention +
 * fiche du cookie) : la parité copie ↔ constante est verrouillée par
 * `test/contract/wishlist-retention-copy.contract.test.ts`.
 */
export const WISHLIST_EXPIRATION_DAYS = 30;
