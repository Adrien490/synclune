import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/urls";

/**
 * Le CTA du premier écran — un bouton primary, comme partout ailleurs sur la
 * boutique.
 *
 * @description
 * ⚠️ **Ne pas le repeindre au pinceau.** Le montage « bouton peint » du
 * 2026-08-06 (une touche `BRUSH_STROKE_PATH` en dégradé de marque derrière une
 * encre `--foreground`, montage jumeau de `BrushHighlight`) a été RETIRÉ sur
 * demande explicite : c'était une **redite du h1**. Le surligneur du mot
 * « colorés » vit à ~150 px au-dessus, avec le même tracé, le même dégradé et
 * le même temps de stagger — deux coups de pinceau de marque dans le même bloc
 * ne se lisaient plus comme un geste, mais comme un motif appliqué deux fois.
 * Le pinceau reste donc l'accent du TITRE, et lui seul.
 *
 * Ce qui portait ce montage et n'a plus de site ici : le calibrage d'épaisseur
 * du trait, la hauteur explicite qu'un `<svg>` sans `width`/`height` exige en
 * position absolue (élément remplacé : le ratio du viewBox l'emporte et le
 * `bottom` est ignoré), l'unicité d'id de `BrandBrushGradient` sur la page — le
 * h1 en redevient l'unique consommateur — et les replis `contrast-more:` /
 * `forced-colors:` qu'il fallait écrire à la main parce que la peinture était
 * la SEULE chrome du bouton. `Button` apporte les trois derniers gratuitement.
 *
 * Le seul écart au défaut du `Button` est `size="lg"` : `text-base`, le cran de
 * l'annotation voisine « Mes dernières créations » (`font-display text-base`,
 * `hero-heading.tsx`). Le défaut du composant compose en `text-sm`, donc PLUS
 * PETIT que la note secondaire à 6 px de lui — hiérarchie inversée entre
 * l'action principale de la page et son voisin. Les 4 px de hauteur en plus
 * (`h-12` contre `h-11`) restent au-dessus de la cible tactile de 44 px.
 *
 * Server Component, zéro JS client — `useRender` n'appelle son hook que si
 * `document` existe.
 */
export function HeroCta() {
	return (
		<Button
			render={<Link href={ROUTES.SHOP.PRODUCTS} />}
			size="lg"
			// `whitespace-normal` + `h-auto min-h-12` : le socle Button pose
			// `whitespace-nowrap` — à 200% de zoom texte sur mobile (WCAG 1.4.4),
			// le libellé (~420px au corps 32) débordait le viewport et mettait un
			// scroll horizontal à la PAGE. On laisse la pilule passer sur deux
			// lignes plutôt que déborder ; à zoom normal rien ne change.
			// `max-w-full` en plus : le lien est `inline-flex`, il se DIMENSIONNE
			// sur son contenu — sans borne au conteneur, retirer le nowrap ne
			// suffisait pas, la pilule s'élargissait au lieu de laisser le texte
			// passer à la ligne (re-mesuré : 37px de débordement inchangés).
			className="h-auto min-h-12 max-w-full whitespace-normal"
		>
			Découvrir la boutique
		</Button>
	);
}
