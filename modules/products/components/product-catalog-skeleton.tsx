import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { PageHeaderSkeleton } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";

interface ProductCatalogSkeletonProps {
	/**
	 * Quand `true`, masque le `PageHeaderSkeleton` sur mobile (`hidden sm:block`)
	 * pour matcher le `PageHeader` réel rendu uniquement sm+.
	 */
	hideHeaderOnMobile?: boolean;
}

/**
 * Squelette du `ProductCatalog` (page racine `/produits` + catégorie
 * `/produits/[productTypeSlug]`).
 *
 * Miroir 1:1 du composant `ProductCatalog` pour éviter tout CLS au moment
 * du swap Suspense → contenu final :
 * - `PageHeaderSkeleton` (desktop) masqué mobile (`hideHeaderOnMobile`)
 * - sticky sub-header mobile (3 boutons miroir `ProductSortBar`)
 * - toolbar desktop (search + tri + filtres)
 * - grille produits (`ProductListSkeleton`)
 */
export function ProductCatalogSkeleton({
	hideHeaderOnMobile = true,
}: ProductCatalogSkeletonProps = {}) {
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
			<PageHeaderSkeleton className={hideHeaderOnMobile ? "hidden sm:block" : undefined} />

			<section className="bg-background relative z-10 pt-[calc(var(--navbar-height)+1rem)] pb-12 sm:pt-4 lg:pt-6 lg:pb-16">
				<div className="group/container mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
					{/* Mobile sticky sub-header skeleton — miroir ProductSortBar (tri / recherche / filtres) */}
					<div
						aria-hidden
						className="bg-background/80 border-border/50 -mx-4 border-b backdrop-blur-md sm:-mx-6 md:hidden"
					>
						<div className="divide-border/30 flex items-stretch divide-x">
							{[0, 1, 2].map((i) => (
								<div key={i} className="flex flex-1 items-center justify-center gap-1.5 px-2 py-3">
									<Skeleton className="size-4 rounded" />
									<Skeleton className="h-3 w-14 rounded" />
								</div>
							))}
						</div>
					</div>

					{/* Desktop toolbar skeleton */}
					<div className="md:bg-card md:border-border/60 hidden min-w-0 p-0 md:flex md:rounded-lg md:border md:p-4 md:shadow-sm">
						<div className="flex w-full flex-row items-center gap-2">
							<div className="min-w-0 flex-1">
								<Skeleton className="h-10 w-full rounded-md" />
							</div>
							<div className="flex shrink-0 flex-row items-center gap-2">
								<Skeleton className="h-11 w-45 rounded-md" />
								<Skeleton className="h-11 w-[90px] rounded-md" />
							</div>
						</div>
					</div>

					<ProductListSkeleton />
				</div>
			</section>
		</div>
	);
}
