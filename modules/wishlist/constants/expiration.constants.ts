/**
 * Constantes pour la gestion de l'expiration des wishlists invité
 */

// Durée de vie d'une wishlist invité (30 jours)
export const WISHLIST_EXPIRATION_DAYS = 30;

// Grace period après expiration session avant cleanup (1 jour)
// Permet de récupérer la wishlist même si la session a expiré
export const WISHLIST_GRACE_PERIOD_DAYS = 1;

// Durée totale avant suppression définitive (31 jours = 30 + 1 grace period)
export const WISHLIST_TOTAL_LIFETIME_DAYS = WISHLIST_EXPIRATION_DAYS + WISHLIST_GRACE_PERIOD_DAYS;

// Conversions en millisecondes
export const WISHLIST_EXPIRATION_MS = WISHLIST_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
export const WISHLIST_GRACE_PERIOD_MS = WISHLIST_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
export const WISHLIST_TOTAL_LIFETIME_MS = WISHLIST_TOTAL_LIFETIME_DAYS * 24 * 60 * 60 * 1000;
