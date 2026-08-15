/**
 * Constantes de l'authentification admin maison (migration lean, lot 1).
 *
 * Une seule utilisatrice (Léane), un seul mot de passe (`ADMIN_PASSWORD` en env),
 * un seul cookie signé — ZÉRO table en base. La révocation serveur n'existe pas :
 * c'est assumé (expiry 7 j, rotation = changer `AUTH_SECRET`).
 */

/** Nom du cookie de session admin. */
export const ADMIN_SESSION_COOKIE = "admin_session";

/** Durée de vie de la session : 7 jours. */
export const ADMIN_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Identité d'affichage de l'administratrice (sidebar admin, audit trail).
 *
 * Il n'y a plus de table `User` à interroger : le nom est une constante — la
 * boutique n'a qu'une opératrice, et l'affichage du prénom combiné à
 * `source: STAFF` n'a jamais eu besoin de plus.
 */
export const ADMIN_DISPLAY_NAME = "Léane";
