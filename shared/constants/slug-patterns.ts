/**
 * Patterns regex pour la génération de slugs
 *
 * Ces patterns sont utilisés par la fonction slugify() pour transformer
 * une chaîne en slug URL-friendly en kebab-case.
 *
 * @example
 * "Été 2024 - Édition Limitée" → "ete-2024-edition-limitee"
 * "Bague en Or 18k" → "bague-en-or-18k"
 */

// ============================================================================
// PATTERNS DE NORMALISATION
// ============================================================================

/**
 * Pattern pour supprimer les diacritiques (accents) après normalisation NFD
 * Correspond à la plage Unicode des marques combinantes (combining marks)
 */
export const DIACRITICS_PATTERN = /[\u0300-\u036f]/g;

/**
 * Patterns pour les ligatures et caractères spéciaux français
 * Ces caractères ne sont pas couverts par la normalisation NFD
 */
export const FRENCH_LIGATURES = {
	/** Ligature œ (œuf, cœur) → oe */
	OE: /[œ]/g,
	/** Ligature æ (ex æquo) → ae */
	AE: /[æ]/g,
	/** C cédille (déjà géré par NFD mais au cas où) → c */
	C_CEDILLA: /[ç]/g,
} as const;

// ============================================================================
// PATTERNS DE NETTOYAGE
// ============================================================================

/**
 * Pattern pour remplacer tous les caractères non-alphanumériques par des tirets
 * Accepte uniquement les lettres minuscules (a-z) et les chiffres (0-9)
 */
export const NON_ALPHANUMERIC_PATTERN = /[^a-z0-9]+/g;

/**
 * Pattern pour fusionner les tirets multiples en un seul
 * "hello---world" → "hello-world"
 */
export const MULTIPLE_DASHES_PATTERN = /-+/g;

/**
 * Pattern pour supprimer les tirets en début et fin de chaîne
 * "-hello-world-" → "hello-world"
 */
export const LEADING_TRAILING_DASHES_PATTERN = /^-+|-+$/g;

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Longueur maximale d'un slug avant troncature
 * Garde de la place pour un éventuel suffixe numérique (-2, -3, etc.)
 */
export const SLUG_MAX_LENGTH = 70;

// ============================================================================
// EXPORT GROUPÉ
// ============================================================================

/**
 * Tous les patterns de slug regroupés
 */
export const SLUG_PATTERNS = {
	DIACRITICS: DIACRITICS_PATTERN,
	FRENCH_LIGATURES,
	NON_ALPHANUMERIC: NON_ALPHANUMERIC_PATTERN,
	MULTIPLE_DASHES: MULTIPLE_DASHES_PATTERN,
	LEADING_TRAILING_DASHES: LEADING_TRAILING_DASHES_PATTERN,
} as const;
