import { Suspense } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";

import type { GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import { HandDrawnRail } from "@/shared/components/storefront-heading";
import { Button } from "@/shared/components/ui/button";
import { CONTAINER_CLASS } from "@/shared/constants/spacing";
import { ROUTES } from "@/shared/constants/urls";

import {
	CollectionsGrid,
	CollectionsGridSkeleton,
	LANDING_COLLECTIONS_COUNT,
} from "./collections-grid";

/**
 * Ancre de la section — même arbitrage que `ATELIER_SECTION_ID` / `FAQ_SECTION_ID` :
 * volontairement NON exportée (l'exporter en ferait un export mort). Une fois
 * publiée, c'est un contrat (liens partagés) : ne plus la renommer.
 */
const COLLECTIONS_SECTION_ID = "collections";

const TITLE_ID = "collections-title";

/**
 * « Choisis ton univers » — les collections, sur la landing.
 *
 * @description
 * Section ajoutée le 2026-08-05 : le ré-audit de l'étal avait
 * conclu que la page ne portait « ni réassurance ni orientation » — la FAQ a
 * couvert la première, cette section couvre la seconde. Placement entre l'étal
 * et la FAQ : accroche produit → orientation → réassurance.
 *
 * Même grammaire que la FAQ (« L'étal continue ») : AUCUN séparateur entre
 * sections — c'est le rythme vertical seul qui les sépare (2026-08-06) —, un
 * bloc titre `h2` + `HandDrawnRail`, jamais de bande à fond
 * plein. L'accent est la MENTHE — c'est celui de la salle Collections dans la
 * barre (`data-accent="mint"` du méga-menu, SSOT navbar-section.ts) : la salle
 * et sa section de landing partagent la même touche.
 *
 * Rail `inView` + `.enter-inview` sur le bloc titre : la parité de la grammaire
 * d'arrivée avec l'atelier et la FAQ (constat n° 6 de l'audit du 2026-08-06 —
 * cette section était la seule au rail inerte et au bloc titre sans entrée).
 *
 * Le titre est rendu HORS de la frontière `Suspense` (l'arbitrage du `<h1>` de
 * l'étal, transposé) : la lecture des collections ne retarde jamais le bloc
 * titre, et le squelette ne couvre que la grille.
 *
 * Aucun JSON-LD ici, délibérément : l'`ItemList` de `/` appartient à l'étal
 * (une seule par URL), et celle des collections appartient à `/collections`.
 */
export function CollectionsSection({
	collectionsPromise,
}: {
	collectionsPromise: Promise<GetCollectionsReturn>;
}) {
	return (
		<section
			id={COLLECTIONS_SECTION_ID}
			aria-labelledby={TITLE_ID}
			// ⚠️ `data-accent="mint"` ajouté le 2026-08-06 : le JSDoc ci-dessus
			// ANNONÇAIT la menthe depuis la création de la section, mais aucun
			// `data-accent` n'était posé — la cascade `--section-accent` /
			// `--section-wash` n'existait donc pas ici, et le rail était peint en dur
			// (`bg-brand-mint`) pendant que chaque carte fille reconstruisait sa
			// couleur de son côté.
			//
			// Conséquence à l'échelle de la page : sur quatre salles, deux seulement
			// portaient un accent (atelier `rose`, FAQ `sun`). Or la polychromie de la
			// DA se joue par la ROTATION d'accents entre sections — pas par un token
			// de plus par couleur. Deux salles sur quatre, c'est la moitié du
			// mécanisme.
			data-accent="mint"
			// ⚠️ PAS de `scroll-mt` : la compensation de la barre fixe est déjà faite
			// UNE fois, globalement, par `html { scroll-padding-top: var(--navbar-height) }`
			// (`app/globals.css`). En ajouter un dérivé de la même hauteur la comptait
			// DEUX fois — mesuré à 1280 : `/#collections` atterrissait avec 104 px de
			// blanc sous la navbar et son `h2` à 168 px. Le `pt-12 lg:pt-16` ci-dessous
			// EST l'air au-dessus du titre (h2 à 64 px de la barre). Cf. `#hero`, qui
			// n'a jamais eu de `scroll-mt` et atterrit juste.
			className={`${CONTAINER_CLASS} pb-12 lg:pb-16`}
		>
			<div className="pt-12 lg:pt-16">
				<div className="enter-inview max-w-[46ch]">
					<h2
						id={TITLE_ID}
						className="font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.08] font-light tracking-[-0.015em]"
					>
						Choisis ton univers
					</h2>

					{/* UNE touche de pinceau, en menthe — l'accent de la salle. `inView` :
					    sous la ligne de flottaison, le tracé se joue à l'ARRIVÉE
					    (timeline `view()`) — la grammaire de l'atelier et de la FAQ. */}
					<div aria-hidden="true" className="mt-1.5 mb-3 flex sm:mt-2 sm:mb-5">
						<HandDrawnRail accent="bg-brand-mint" inView />
					</div>

					<p className="text-muted-foreground text-[1.0625rem] leading-[1.65]">
						Mes créations vivent en petites séries — chacune a ses couleurs et son histoire. Entre
						dans celle qui te parle.
					</p>
				</div>

				{/* Pas d'`items-start` ici, contrairement à la grille de l'étal : les
				    cartes d'une rangée s'étirent à la plus haute (défaut `stretch`), et
				    la carte remplit son `<li>` en `h-full`. Mesuré à l'audit du
				    2026-08-06 : avec `items-start`, un nom qui passe à deux lignes rendait
				    sa carte à 232px contre 204px pour sa voisine, et les lignes
				    « À partir de… » d'une même rangée se retrouvaient à 28px d'écart.
				    L'étal n'a pas le problème — ses cartes ont un média à ratio fixe et
				    une seule ligne de prix, donc une hauteur naturellement constante. */}
				<ul
					aria-label="Les collections"
					className="mt-8 grid grid-cols-2 gap-4 sm:mt-10 sm:gap-6 lg:grid-cols-4"
				>
					<Suspense fallback={<CollectionsGridSkeleton />}>
						<CollectionsGrid collectionsPromise={collectionsPromise} />
					</Suspense>
				</ul>

				{/* La sortie : `/collections` nue — la landing montre les portes, le
				    carnet des séries les raconte.

				    ⚠️ Sa propre frontière `Suspense`, et pas un `await` dans la section :
				    le `<h2>` et le chapô ci-dessus ne doivent JAMAIS dépendre de la
				    lecture catalogue. Le repli rend le même bouton sans le chiffre — la
				    portée est un plus, jamais un prérequis à l'affichage du lien. */}
				<div className="mt-8 sm:mt-10">
					<Suspense fallback={<CollectionsExitLink />}>
						<CollectionsExitLinkWithScope collectionsPromise={collectionsPromise} />
					</Suspense>
				</div>
			</div>
		</section>
	);
}

/**
 * La sortie vers `/collections`, avec sa PORTÉE quand on la connaît.
 *
 * « Voir les 7 collections » plutôt que « Toutes les collections » : Baymard
 * mesure que 58-59 % des sites échouent à donner la portée de leurs liens sur
 * mobile, et que les visiteuses lisent alors la grille affichée comme étant le
 * catalogue entier. La landing n'en montre que quatre
 * (`LANDING_COLLECTIONS_COUNT`) — sans le chiffre, elle laisse croire qu'il n'en
 * existe que quatre.
 *
 * Le seuil est `> LANDING_COLLECTIONS_COUNT` et pas `> 1` : annoncer « Voir les 4
 * collections » sous une grille qui en montre déjà quatre n'apprend rien et fait
 * du lien un aller-retour. Le libellé nu reste alors le bon.
 */
function CollectionsExitLink({ label = "Toutes les collections" }: { label?: string }) {
	return (
		<Button render={<Link href={ROUTES.SHOP.COLLECTIONS} />} variant="outline">
			{label}
			<ArrowRightIcon aria-hidden="true" className="size-4" />
		</Button>
	);
}

async function CollectionsExitLinkWithScope({
	collectionsPromise,
}: {
	collectionsPromise: Promise<GetCollectionsReturn>;
}) {
	const { totalCount } = await collectionsPromise;

	return (
		<CollectionsExitLink
			label={
				totalCount > LANDING_COLLECTIONS_COUNT
					? `Voir les ${totalCount} collections`
					: "Toutes les collections"
			}
		/>
	);
}
