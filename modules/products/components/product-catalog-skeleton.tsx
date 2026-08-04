import { CatalogHeadingSkeleton } from "@/modules/products/components/catalog-heading";
import { CATALOG_GRID } from "@/modules/products/components/catalog-grid.constants";
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Squelette du `ProductCatalog` (page racine `/produits` + catégorie
 * `/produits/[productTypeSlug]`).
 *
 * Miroir 1:1 de `ProductCatalog` pour éviter tout CLS au swap Suspense →
 * contenu final, direction « L'étal continue » (2026-08-05) :
 * - fil d'Ariane desktop (`hidden md:block`)
 * - barre unique collante (3 cellules sous `md`, champ déplié au-dessus)
 * - grille unique : bloc titre en première cellule, puis les cartes
 *
 * ⚠️ La géométrie de la grille vient de la SSOT `catalog-grid.constants.ts` — la
 * réécrire ici la laisserait dériver au premier changement de gouttière.
 */
export function ProductCatalogSkeleton() {
	return (
		/*
		 * `role="status"` + `aria-busy` : ce squelette est le `loading.tsx` complet de
		 * `/produits` et `/produits/[productTypeSlug]` (les deux fichiers ne rendent que
		 * ce composant). Sans ces attributs, le chargement des deux routes catalogue —
		 * les plus visitées du site — n'était annoncé d'aucune façon, alors que les ~70
		 * autres `loading.tsx` le sont.
		 */
		<div className="min-h-dvh" role="status" aria-busy="true" aria-label="Chargement du catalogue">
			<span className="sr-only">Chargement du catalogue…</span>

			<section className="bg-background relative z-10 pt-[calc(var(--navbar-height-static)+0.75rem)] pb-12 lg:pt-[calc(var(--navbar-height-static)+1.25rem)] lg:pb-16">
				<div className="group/container mx-auto max-w-6xl space-y-5 px-4 sm:px-6 lg:px-8">
					{/* Fil d'Ariane desktop */}
					<div aria-hidden className="hidden md:block">
						<Skeleton className="h-5 w-44 rounded" />
					</div>

					{/* Barre unique — miroir de `ProductSortBar` */}
					<div
						aria-hidden
						className="bg-background/80 border-border/50 -mx-4 border-b px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
					>
						<div className="flex items-stretch gap-3">
							<div className="hidden min-w-0 flex-1 items-center py-2 md:flex">
								<Skeleton className="h-11 w-full max-w-md rounded-md" />
							</div>
							<div className="divide-border/30 flex flex-1 items-stretch divide-x md:flex-none md:items-center md:gap-1 md:divide-x-0">
								{[0, 1, 2].map((i) => (
									<div
										key={i}
										className={`flex h-11 flex-1 items-center justify-center gap-1.5 px-2 md:flex-none md:px-3.5 ${
											i === 1 ? "md:hidden" : ""
										}`}
									>
										<Skeleton className="size-4 rounded" />
										<Skeleton className="h-3 w-14 rounded" />
									</div>
								))}
							</div>
						</div>
					</div>

					<div className={CATALOG_GRID}>
						<CatalogHeadingSkeleton />
						<ProductListSkeleton />
					</div>
				</div>
			</section>
		</div>
	);
}
