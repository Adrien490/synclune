import { Suspense } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";

import type { GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import { HandDrawnRail } from "@/shared/components/storefront-heading";
import { Button } from "@/shared/components/ui/button";
import { CONTAINER_CLASS } from "@/shared/constants/spacing";
import { ROUTES } from "@/shared/constants/urls";

import { CollectionsGrid, CollectionsGridSkeleton } from "./collections-grid";

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
 * Section ajoutée le 2026-08-05 (décision documentée dans
 * `docs/LANDING-SECTION-COLLECTIONS.md`) : le ré-audit de l'étal avait
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
			// `scroll-mt` : l'ancre `/#collections` ne doit pas coller le titre sous
			// la barre fixe. `--navbar-height-static`, jamais `--navbar-height` (qui
			// retombe au premier pixel scrollé) — le pattern atelier/FAQ.
			className={`${CONTAINER_CLASS} scroll-mt-[calc(var(--navbar-height-static)+1.5rem)] pb-12 lg:pb-16`}
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

				{/* `items-start`, comme la grille de l'étal : deux cartes d'une même
				    rangée ne se réalignent pas sur la plus haute. */}
				<ul
					aria-label="Les collections"
					className="mt-8 grid grid-cols-2 items-start gap-4 sm:mt-10 sm:gap-6 lg:grid-cols-4"
				>
					<Suspense fallback={<CollectionsGridSkeleton />}>
						<CollectionsGrid collectionsPromise={collectionsPromise} />
					</Suspense>
				</ul>

				{/* La sortie : `/collections` nue — la landing montre les portes, le
				    carnet des séries les raconte. */}
				<div className="mt-8 sm:mt-10">
					<Button render={<Link href={ROUTES.SHOP.COLLECTIONS} />} variant="outline">
						Toutes les collections
						<ArrowRightIcon aria-hidden="true" className="size-4" />
					</Button>
				</div>
			</div>
		</section>
	);
}
