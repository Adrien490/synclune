/**
 * Constantes partagées entre CursorPagination et son skeleton
 * Garantit la cohérence des dimensions pour éviter le layout shift
 *
 * Registre : 48 px sur tactile (< md, liste mobile admin), 32 px dense sur le
 * desktop admin (≥ md, pointeur fin) — la barre est un instrument de l'outil,
 * pas un contrôle de vitrine (audit 2026-08-05).
 */

/**
 * Classes de taille pour le bouton "Retour au début"
 */
export const RESET_BUTTON_SIZE = "size-12 md:h-8 md:w-18";

/**
 * Classes de taille pour les boutons précédent/suivant
 */
export const NAV_BUTTON_SIZE = "size-12 md:size-8";

/**
 * Classes de taille pour l'indicateur de page central
 */
export const PAGE_INDICATOR_SIZE = "h-12 md:h-8 min-w-20 sm:min-w-25";
