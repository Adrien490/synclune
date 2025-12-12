/**
 * Constantes pour la gestion de l'expiration des paniers
 */

// Durée de vie d'un panier invité (7 jours)
export const CART_EXPIRATION_DAYS = 7;

// Grace period après expiration session avant cleanup (1 jour)
// Permet de récupérer le panier même si la session a expiré
export const CART_GRACE_PERIOD_DAYS = 1;

// Durée totale avant suppression définitive (8 jours = 7 + 1 grace period)
export const CART_TOTAL_LIFETIME_DAYS = CART_EXPIRATION_DAYS + CART_GRACE_PERIOD_DAYS;

// Conversions en millisecondes
export const CART_EXPIRATION_MS = CART_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
export const CART_GRACE_PERIOD_MS = CART_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
export const CART_TOTAL_LIFETIME_MS = CART_TOTAL_LIFETIME_DAYS * 24 * 60 * 60 * 1000;
