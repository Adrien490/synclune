import { CATALOG_GRID } from "@/modules/products/components/catalog-grid.constants";
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { BreadcrumbNavSkeleton } from "@/shared/components/breadcrumb-nav";
import { StorefrontHeadingSkeleton } from "@/shared/components/storefront-heading";

/** Miroir 1:1 du shell de `page.tsx` — même section, même grille (CLS). */
export default function CollectionDetailLoading() {
	return (
		<div
			className="min-h-dvh"
			role="status"
			aria-busy="true"
			aria-label="Chargement de la collection"
		>
			<span className="sr-only">Chargement de la collection…</span>

			<section className="bg-background relative z-10 pt-[calc(var(--navbar-height-static)+0.75rem)] pb-12 lg:pt-[calc(var(--navbar-height-static)+1.25rem)] lg:pb-16">
				<div className="mx-auto max-w-6xl space-y-5 px-4 sm:px-6 lg:px-8">
					<BreadcrumbNavSkeleton />

					{/* Bloc titre en tête de page, hors de la grille — même position que
					    `page.tsx` (parité CLS). `accent="mono"` : la page réelle rend une
					    touche unique (couleur de collection par slug) que ce fichier ne
					    peut pas connaître — barre neutre plutôt qu'un flash
					    quatre-couleurs → une.
					    `descriptionLines` reste à 1 : le chapô réel vient de la BASE
					    (descriptions courtes, une ligne — 27 c. observés), le repli long
					    à deux lignes ne servant qu'aux collections sans description.
					    Variance assumée : ce fichier ne connaît pas plus la copie que la
					    couleur (audit 79/100 du 2026-08-05). */}
					<StorefrontHeadingSkeleton accent="mono" />

					<div className={CATALOG_GRID}>
						<ProductListSkeleton />
					</div>
				</div>
			</section>
		</div>
	);
}
