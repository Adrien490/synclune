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
 * Décline l'ancienne CARD_SURFACE_BASE SANS `overflow-hidden` : les décors de
 * la carte peuvent déborder du cadre (lift au survol, halo), c'est la zone
 * média de chaque carte qui clippe.
 * Le padding est la marge blanche du tirage ; pas de padding bas, la légende
 * gère le sien.
 */
export const CARD_SURFACE_POLAROID = [
	"bg-card group relative touch-manipulation",
	"rounded-md border-2 border-transparent shadow-sm",
	"p-2 pb-0 sm:p-2.5 sm:pb-0",
	// `translate,rotate` et non `transform` : en Tailwind v4, `-translate-y-1` /
	// `rotate-1` alimentent les propriétés CSS AUTONOMES `translate`/`rotate`
	// (`.-rotate-1{rotate:-1deg}` dans le CSS compilé) — une liste qui ne
	// déclarait que `transform` faisait sauter le lift/tilt à la frame 1,
	// pendant que bordure et ombre s'animaient bien sur 300 ms.
	"transition-[translate,rotate,border-color,box-shadow] duration-300 ease-out",
	"motion-reduce:transition-colors",
].join(" ");

export const CARD_SURFACE_HOVER = [
	"can-hover:hover:border-primary/40",
	"can-hover:hover:shadow-[0_8px_30px_-8px_var(--color-glow-pink),0_4px_15px_-5px_var(--color-glow-lavender)]",
].join(" ");

/**
 * `has-[:focus-visible]:` et non `focus-within:` : le halo est la parité
 * CLAVIER du hover (WCAG 2.4.7), or `:focus-within` s'allume aussi au clic
 * souris sur un contrôle interne (wishlist, pastille couleur) — la carte
 * flashait sa bordure sur un simple clic (audit ProductCard 2026-08-08).
 * `:has(:focus-visible)` suit l'heuristique navigateur : clavier oui, souris
 * non. Les révélations d'affordances internes (CTA, pastilles, squiggle)
 * restent en `focus-within`/`group-focus-within` — elles doivent répondre à
 * TOUTE entrée de focus, programmatique incluse.
 */
export const CARD_SURFACE_FOCUS =
	"has-[:focus-visible]:border-primary/40 has-[:focus-visible]:shadow-primary/15 has-[:focus-visible]:shadow-lg";

/**
 * Inclinaison alternée des tirages (par index de grille). Pose STATIQUE, pas
 * un mouvement → pas de `motion-safe:`. Classes LITTÉRALES, jamais
 * interpolées : Tailwind ne compose que ce qu'il lit tel quel dans les
 * sources. `TIRAGE_TILT` de `mega-menu-creations.tsx` reste à part, ses valeurs
 * diffèrent volontairement.
 *
 * ⚠️ **Sans consommateur depuis le 2026-08-08** (knip le signale, à raison) :
 * ses deux appelants étaient la carte collection de la landing et celle du
 * méga-menu, supprimées ensemble. Gardée délibérément — c'est elle qui a mis fin
 * à la recopie des mêmes valeurs des deux côtés (harmonisation 2026-08-06), et
 * la refonte doit repartir d'ICI plutôt que de re-diverger.
 */
export const CARD_TILT = ["-rotate-[0.8deg]", "rotate-[0.7deg]"] as const;
