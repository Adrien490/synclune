/**
 * Constantes du checkout Stripe hébergé (migration lean, lot 3).
 */

/**
 * Durée de vie d'une session Checkout = durée de la réservation de stock.
 *
 * Stripe impose un minimum de 30 min ; on ajoute une marge d'une minute pour
 * ne pas dépendre de l'horloge locale (un `now + 30 min` exact peut être
 * refusé par l'API si nos horloges divergent de quelques secondes).
 */
export const CHECKOUT_SESSION_TTL_SECONDS = 31 * 60;

/** Libellé de la réservation côté client (page d'annulation, panier). */
export const CHECKOUT_RESERVATION_LABEL = "environ 30 minutes";

/**
 * Préfixe du `stripeSessionId` provisoire posé par la transaction de
 * réservation AVANT la création de la session Stripe. La colonne est
 * `@unique` et non-nulle : ce placeholder garantit « jamais d'Order sans
 * stripeSessionId » ; il est remplacé par le `cs_…` réel juste après.
 * Un Order qui le porte encore est un vestige d'échec Stripe (rollback
 * compensatoire interrompu) — la réconciliation admin le traite comme expiré.
 */
export const PENDING_SESSION_PLACEHOLDER_PREFIX = "pending_";

/**
 * Âge minimal (heures) d'une commande PENDING avant que la réconciliation
 * admin n'interroge Stripe. Les sessions expirent en ~30 min : à 24 h, une
 * PENDING encore là a forcément raté son webhook.
 */
export const PENDING_ORDER_RECONCILE_AGE_HOURS = 24;
