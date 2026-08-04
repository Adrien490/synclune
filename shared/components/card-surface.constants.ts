/**
 * Classes Tailwind partagées entre ProductCard et CollectionCard.
 * SSOT pour l'enveloppe visuelle des cards storefront (surface, hover, focus, motion).
 * Toute évolution visuelle de la surface doit passer par ici pour rester cohérente.
 *
 * Différences à laisser inline dans chaque composant : display (grid/block),
 * sens du tilt (alterné par index), classes hook (`product-card`, …).
 */

/**
 * Surface « tirage papier » des cartes Atelier (ProductCard polaroid,
 * CollectionCard planche-contact) — redesigns 2026-08-03.
 *
 * Décline l'ancienne CARD_SURFACE_BASE SANS `overflow-hidden` : le masking
 * tape déborde du cadre, c'est la zone média de chaque carte qui clippe.
 * Le padding est la marge blanche du tirage ; pas de padding bas, la légende
 * gère le sien.
 */
export const CARD_SURFACE_POLAROID = [
	"bg-card group relative touch-manipulation",
	"rounded-md border-2 border-transparent shadow-sm",
	"p-2 pb-0 sm:p-2.5 sm:pb-0",
	"transition-[transform,border-color,box-shadow] duration-300 ease-out",
	"motion-reduce:transition-colors",
].join(" ");

export const CARD_SURFACE_HOVER = [
	"can-hover:hover:border-primary/40",
	"can-hover:hover:shadow-[0_8px_30px_-8px_var(--color-glow-pink),0_4px_15px_-5px_var(--color-glow-lavender)]",
].join(" ");

export const CARD_SURFACE_FOCUS =
	"focus-within:border-primary/40 focus-within:shadow-primary/15 focus-within:shadow-lg";
