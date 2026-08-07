import { CREATION_PATHS } from "@/shared/components/hand-drawn/paths";
import { ATELIER_HOWTO } from "@/shared/constants/atelier-content";

import { AtelierThreadStroke } from "./atelier-thread";

/**
 * La goutte-puce des inventaires — le signe transversal de la marque, pris
 * dans la SSOT du présentoir plutôt que redessiné : le raisin, la pluie, la
 * larme et la pampille du bas de section sont déjà cette goutte-là.
 */
const BULLET = CREATION_PATHS.drop;

const GROUPS: ReadonlyArray<{ label: string; items: ReadonlyArray<string> }> = [
	{ label: "Les matières", items: ATELIER_HOWTO.supplies },
	{ label: "Les outils", items: ATELIER_HOWTO.tools },
];

/**
 * « Sur la table » — l'inventaire de l'atelier, sous le portrait.
 *
 * @description
 * Né de l'audit du 2026-08-06, et il règle TROIS choses d'un coup :
 *
 * 1. **Le vide.** La colonne de gauche ne portait que le polaroid : 362×476 px
 *    de plaque « portrait à venir » pour 72 px de cœur à `lg`, et ~420×370 px
 *    de blanc à sa droite à 768 px. Deux vides mesurés, dont le second n'avait
 *    même pas de réponse prévue.
 * 2. **Le balisage.** `supply`, `tool` et `totalTime` étaient émis dans le nœud
 *    `HowTo` du `@graph` sans exister à l'écran — cf. la JSDoc d'`ATELIER_HOWTO`.
 * 3. **Le lexique.** Plastique fou, peinture acrylique, vernis, perles, pinceaux
 *    fins, four ménager : c'est le vocabulaire de matières de la marque, et une
 *    accumulation de petits éléments plutôt qu'un bloc de plus — maximalisme
 *    miniature.
 *
 * Et surtout : **ça survit à l'arrivée de la photo.** C'est le reproche qui
 * avait tué la direction « scène dessinée » (tout l'investissement vivait dans
 * la branche `src === null` et mourait au ré-upload) ; ici le bloc est sous le
 * tirage, quel que soit son état.
 *
 * Placement (porté par l'appelant) : empilé sous le tirage en dessous de `sm`,
 * à sa DROITE de `sm` à `lg` — c'est là qu'est le vide de 768 —, puis à nouveau
 * dessous dans la colonne sticky de 22 rem à `lg`.
 */
export function AtelierWorktable() {
	return (
		<div className="min-w-0 flex-1">
			<p className="font-cursive text-foreground text-lg">Sur la table</p>

			{GROUPS.map((group) => (
				<div key={group.label} className="mt-3">
					<p className="text-muted-foreground text-[0.8125rem] tracking-wide uppercase">
						{group.label}
					</p>
					<ul className="mt-1.5 space-y-1">
						{group.items.map((item) => (
							<li key={item} className="flex items-baseline gap-2">
								{/* La puce est l'aplat d'accent de la salle, le mot reste en
								    encre : les quatre accents valent 1,5–2,6:1 en trait et
								    7,8–13,4:1 en aplat, ils peignent donc, ils n'écrivent pas. */}
								<AtelierThreadStroke path={BULLET} width={9} fill className="shrink-0" />
								<span className="text-muted-foreground text-[0.9375rem] leading-snug">{item}</span>
							</li>
						))}
					</ul>
				</div>
			))}

			<p className="font-cursive text-muted-foreground mt-4 text-[0.9375rem]">
				{ATELIER_HOWTO.totalTimeLabel}
			</p>
		</div>
	);
}
