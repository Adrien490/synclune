import { RAIL_ACCENTS } from "@/modules/products/components/catalog-accents.constants";

/**
 * La TROISIÈME projection de `RAIL_ACCENTS` — après `STROKE_CLASS_BY_ACCENT`
 * (`storefront-heading.tsx`, les classes `stroke-*` du rail) et
 * `RAIL_ACCENT_TO_DATA_ACCENT` (`catalog-accents.constants.ts`, les valeurs
 * `data-accent`). Même raison qu'elles : Tailwind ne compile que les classes
 * écrites en littéral, et une variable CSS ne se dérive pas d'un nom de classe
 * par manipulation de chaîne.
 *
 * ⚠️ Ce sont des SURFACES. Aucun de ces quatre accents ne dépasse 2,63:1 sur
 * `--background` — ils ne portent jamais d'encre. C'est sous `--foreground`
 * qu'ils tiennent (7,85 à 12,68:1), et c'est exactement le montage des deux
 * consommateurs de ce dégradé : le trait passe DERRIÈRE une encre
 * `--foreground`.
 */
const BRUSH_VAR_BY_ACCENT: Record<(typeof RAIL_ACCENTS)[number], string> = {
	"bg-primary": "var(--primary)",
	"bg-brand-lavender": "var(--color-brand-lavender)",
	"bg-brand-mint": "var(--color-brand-mint)",
	"bg-brand-sun": "var(--color-brand-sun)",
};

/** Décimales de l'offset — assez pour 4 accents, sans polluer le markup. */
const OFFSET_PRECISION = 4;

/**
 * Le dégradé du coup de pinceau de marque : les quatre accents balayés de
 * gauche à droite dans l'ordre du rail (rose → lavande → menthe → soleil).
 *
 * @description
 * Extrait de `brush-highlight.tsx` le 2026-08-06, quand le CTA du hero a eu
 * besoin du même dégradé — c'est-à-dire le jour annoncé par la JSDoc de ce
 * composant : *« l'id est fixe, le composant n'a qu'un montage ; en monter un
 * second sur la même page dupliquerait l'id — passer l'id en prop »*.
 *
 * ⚠️ Ce second consommateur a été RETIRÉ le jour même (`hero-cta.tsx` : deux
 * coups de pinceau de marque dans le même bloc titre se lisaient comme une
 * redite du h1, pas comme un geste). `BrushHighlight` est donc à nouveau
 * l'unique appelant — ne PAS en profiter pour re-fixer l'id dans le corps : ce
 * qui suit reste vrai, et c'est ce qui rendrait le prochain doublon muet. Deux
 * `<linearGradient>` de même id sur une page ne rendent pas une erreur : le
 * second est simplement ignoré, et le tracé qui le référence se peint avec le
 * premier. C'est pour ça que l'`id` est ici une prop REQUISE, sans défaut.
 *
 * ⚠️ `stop-color` passe par `style`, jamais en attribut de présentation SVG :
 * un `var()` en attribut n'est pas garanti par la spec.
 *
 * Les offsets sont DÉRIVÉS (`index / (n - 1)`), donc `0 / 0.3333 / 0.6667 / 1`
 * là où les quatre `<stop>` écrits à la main portaient `0 / 0.34 / 0.67 / 1` —
 * l'écart est sous le seuil de visibilité sur un trait de 200 unités, et c'est
 * le prix de ne plus avoir deux tables à garder d'accord.
 *
 * @param id - Identifiant du dégradé, à référencer en `stroke="url(#id)"`.
 *   UNIQUE dans le document : c'est la raison d'être de cette prop.
 */
export function BrandBrushGradient({ id }: { id: string }) {
	const lastIndex = RAIL_ACCENTS.length - 1;

	return (
		<linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
			{RAIL_ACCENTS.map((accent, index) => (
				<stop
					key={accent}
					offset={Number((index / lastIndex).toFixed(OFFSET_PRECISION))}
					style={{ stopColor: BRUSH_VAR_BY_ACCENT[accent] }}
				/>
			))}
		</linearGradient>
	);
}
