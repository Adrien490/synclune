import { Suspense } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";

import type { GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import { HandDrawnRail } from "@/shared/components/storefront-heading";
import { Button } from "@/shared/components/ui/button";
import { CONTAINER_CLASS } from "@/shared/constants/spacing";
import { ROUTES } from "@/shared/constants/urls";

import { CollectionsGrid, CollectionsGridSkeleton } from "./collections-grid";

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
 * Même grammaire que la FAQ (« L'étal continue ») : un filet haut pour seul
 * séparateur, un bloc titre `h2` + `HandDrawnRail`, jamais de bande à fond
 * plein. L'accent est la MENTHE — c'est celui de la salle Collections dans la
 * barre (`data-accent="mint"` du méga-menu, SSOT navbar-section.ts) : la salle
 * et sa section de landing partagent la même touche.
 *
 * `animated={false}` sur le rail, comme la FAQ : la section est sous la ligne
 * de flottaison et `HandDrawnRail` n'anime qu'au montage — le tracé se serait
 * joué avant que quiconque l'atteigne.
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
		<section aria-labelledby={TITLE_ID} className={`${CONTAINER_CLASS} pb-12 lg:pb-16`}>
			<div className="border-border/60 border-t pt-12 lg:pt-16">
				<div className="max-w-[46ch]">
					<h2
						id={TITLE_ID}
						className="font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.08] font-light tracking-[-0.015em]"
					>
						Choisis ton univers
					</h2>

					<div aria-hidden="true" className="mt-1.5 mb-3 flex sm:mt-2 sm:mb-5">
						<HandDrawnRail accent="bg-brand-mint" animated={false} />
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
