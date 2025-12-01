/**
 * Tronque un texte à une longueur maximale avec ellipse
 * @param text - Le texte à tronquer
 * @param maxLength - La longueur maximale (défaut: 20)
 * @returns Le texte tronqué avec "…" si nécessaire
 */
export function truncateText(text: string, maxLength: number = 20): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}…`
}

/**
 * Presets de longueur pour différents contextes d'affichage
 */
export const TRUNCATE_PRESETS = {
  /** Graphiques (étiquettes axes) */
  chart: 20,
  /** Badges/tags */
  badge: 12,
  /** Noms de collections */
  collection: 15,
  /** Noms de produits */
  product: 25,
} as const
