/**
 * Les quatre accents de marque du catalogue, dans l'ordre du rail de la page
 * d'accueil — SSOT partagée entre le bloc titre et le carton d'étal.
 *
 * @description
 * Ce sont des **APLATS** et rien d'autre : sur `--background`, aucun des quatre
 * ne dépasse 2,63:1, donc aucun ne peut porter du texte. Sous `--foreground`,
 * ils donnent 7,85 à 12,68:1 — c'est le seul registre où les employer.
 * (`--color-brand-rose-strong`, lui, est le rose qui porte de l'encre : 5,15:1.)
 *
 * Extraite de `catalog-heading.tsx` le 2026-08-05, quand le carton d'étal a eu
 * besoin du même rail pour son liseré de progression : le rail qui OUVRE la page
 * est celui qui la FERME, et deux copies littérales auraient divergé au premier
 * changement de palette. Ce module ne porte que des chaînes — il traverse donc
 * la frontière serveur/client sans rien embarquer.
 */
import type { FilterSectionId } from "@/modules/products/services/product-filter-params.service";

export const RAIL_ACCENTS = [
	"bg-primary",
	"bg-brand-lavender",
	"bg-brand-mint",
	"bg-brand-sun",
] as const;

/** Nombre de segments du rail — pilote le cycle du liseré du carton d'étal. */
export const RAIL_SEGMENT_COUNT = RAIL_ACCENTS.length;

/**
 * La réglette d'accents du panneau de filtres — un accent de marque par
 * critère, posé EN TRAIT dans les en-têtes de section (« La réglette »,
 * artifact filtres 2026-08-04, lot 1).
 *
 * Même registre que {@link RAIL_ACCENTS} : des APLATS, qui ne portent de
 * l'encre qu'en `--foreground` (7,85 à 12,68:1). `availability` reste neutre —
 * l'artifact n'accorde que quatre accents, et un cinquième ferait sapin de
 * Noël. Repli si le sapin apparaît quand même : mapper les cinq entrées sur un
 * accent unique (une ligne à changer, les consommateurs suivent).
 */
export const FILTER_SECTION_ACCENTS: Record<FilterSectionId, string> = {
	types: "bg-brand-lavender",
	price: "bg-brand-sun",
	colors: "bg-primary",
	materials: "bg-brand-mint",
	availability: "bg-border",
};

/**
 * L'habillage « étiquette de bocal » du bandeau de filtres actifs (« B »,
 * artifact filter-badges 2026-08-05, lot 1) : liseré gauche + lavis à 10 %,
 * aux MÊMES accents que {@link FILTER_SECTION_ACCENTS} — l'étiquette répond
 * au compartiment du rail dont elle sort, on reconnaît la facette sans lire.
 *
 * Même contrat que tout ce fichier : des SURFACES, jamais de l'encre — le
 * texte de l'étiquette reste `--foreground` / `--muted-foreground`, et le
 * label de facette reste VISIBLE (la couleur le double, WCAG 1.4.1).
 *
 * Deux décisions du ré-audit FilterBadge (2026-08-05) :
 * - `availability` reste NEUTRE (pas de 5ᵉ couleur — « sapin de Noël »), mais
 *   son liseré doit être PERCEPTIBLE : en `border-l-border` (~1,16:1 sur
 *   `bg-card`), « En promotion » était le sosie exact du contrôle « +1
 *   autres » voisin — un filtre actif qui ressemble à un bouton d'UI.
 *   `foreground/25` garde le registre gris tout en marquant l'étiquette.
 * - Chaque entrée re-affirme son liseré en `focus-visible:` : l'utilitaire
 *   `focus-ring` pose `focus-visible:border-ring` sur les QUATRE côtés, et
 *   sans cette parité le liseré de facette disparaissait au focus clavier.
 */
export const FILTER_BADGE_ACCENTS: Record<FilterSectionId, string> = {
	types: "border-l-brand-lavender bg-brand-lavender/10 focus-visible:border-l-brand-lavender",
	price: "border-l-brand-sun bg-brand-sun/10 focus-visible:border-l-brand-sun",
	colors: "border-l-primary bg-primary/10 focus-visible:border-l-primary",
	materials: "border-l-brand-mint bg-brand-mint/10 focus-visible:border-l-brand-mint",
	availability: "border-l-foreground/25 bg-card focus-visible:border-l-foreground/25",
};

/**
 * Facette d'un badge à partir de sa clé d'URL storefront (clés nues, cf.
 * `app/(shop)/produits/_utils/params.ts`). `categoryType` est le filtre
 * synthétique injecté par `ProductFilterBadges` sur `/produits/[type]`.
 */
const FILTER_KEY_TO_SECTION: Record<string, FilterSectionId> = {
	type: "types",
	categoryType: "types",
	color: "colors",
	material: "materials",
	priceMin: "price",
	priceMax: "price",
	stockStatus: "availability",
	onSale: "availability",
};

/** Classes d'accent d'une étiquette de filtre ; neutre si la clé est inconnue. */
export function badgeAccentForFilterKey(key: string): string {
	const section = FILTER_KEY_TO_SECTION[key];
	return section ? FILTER_BADGE_ACCENTS[section] : FILTER_BADGE_ACCENTS.availability;
}

/**
 * Couleur d'une page fille (type, collection), dérivée de son slug.
 *
 * Il n'existe pas de couleur par type ou par collection en base, et en ajouter
 * une serait un champ de plus à remplir. Une somme des points de code donne un
 * accent STABLE (le slug ne change pas — il porte l'URL indexée) et réparti,
 * sans migration ni saisie.
 */
export function accentForSlug(slug: string): (typeof RAIL_ACCENTS)[number] {
	let sum = 0;
	for (let i = 0; i < slug.length; i++) sum += slug.charCodeAt(i);
	return RAIL_ACCENTS[sum % RAIL_ACCENTS.length]!;
}

/**
 * La même couleur, sous sa forme `data-accent` (cf. `app/styles/section-accents.css`).
 *
 * Dérivée de `accentForSlug` — et non d'un second hash — pour que la carte d'une
 * collection et le rail de sa page fille ne puissent JAMAIS diverger : c'était
 * précisément le défaut (audit CollectionCard 2026-08-05, P2 « la carte promet
 * rose, la page fille répond menthe »).
 */
const RAIL_ACCENT_TO_DATA_ACCENT = {
	"bg-primary": "rose",
	"bg-brand-lavender": "lavender",
	"bg-brand-mint": "mint",
	"bg-brand-sun": "sun",
} as const satisfies Record<(typeof RAIL_ACCENTS)[number], string>;

export type DataAccent =
	(typeof RAIL_ACCENT_TO_DATA_ACCENT)[keyof typeof RAIL_ACCENT_TO_DATA_ACCENT];

export function dataAccentForSlug(slug: string): DataAccent {
	return RAIL_ACCENT_TO_DATA_ACCENT[accentForSlug(slug)];
}
