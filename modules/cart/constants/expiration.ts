/**
 * Constantes pour la gestion de l'expiration des paniers
 */

// Durée de vie d'un panier invité (7 jours)
export const CART_EXPIRATION_DAYS = 7;

// Conversions en millisecondes
export const CART_EXPIRATION_MS = CART_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
