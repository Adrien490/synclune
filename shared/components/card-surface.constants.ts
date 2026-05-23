/**
 * Classes Tailwind partagées entre ProductCard et CollectionCard.
 * SSOT pour l'enveloppe visuelle des cards storefront (border, shadow, hover, focus, motion).
 * Toute évolution visuelle de la surface doit passer par ici pour rester cohérente.
 *
 * Différences à laisser inline dans chaque composant : rounded breakpoint, scale ratio,
 * effets propres (lift, GPU hint, active tap feedback).
 */

export const CARD_SURFACE_BASE = [
	"bg-card group relative touch-manipulation overflow-hidden",
	"border-2 border-transparent shadow-sm",
	"transition-[transform,border-color,box-shadow] duration-300 ease-out",
	"motion-reduce:transition-colors",
].join(" ");

export const CARD_SURFACE_HOVER = [
	"can-hover:hover:border-primary/40",
	"can-hover:hover:shadow-[0_8px_30px_-8px_var(--color-glow-pink),0_4px_15px_-5px_var(--color-glow-lavender)]",
].join(" ");

export const CARD_SURFACE_FOCUS =
	"focus-within:border-primary/40 focus-within:shadow-primary/15 focus-within:shadow-lg";
