import { CatalogHeadingSkeleton } from "@/modules/products/components/catalog-heading";
import { CATALOG_GRID } from "@/modules/products/components/catalog-grid.constants";
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { SHELF_BAR_SHELL } from "@/shared/components/shelf-bar/shelf-bar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";

/**
 * Squelette du `ProductCatalog` (page racine `/produits` + catégorie
 * `/produits/[productTypeSlug]`).
 *
 * Miroir 1:1 de `ProductCatalog` pour éviter tout CLS au swap Suspense →
 * contenu final :
 * - fil d'Ariane desktop (`hidden md:block`)
 * - bloc titre seul (le cluster recherche/tri est parti avec la recherche
 *   inline, 2026-08-06 — le tri vit dans le meuble de filtres)
 * - barre collante `lg:hidden` : une seule étiquette « Filtrer »
 * - grille : uniquement les cartes
 *
 * ⚠️ La géométrie de la grille vient de la SSOT `catalog-grid.constants.ts` — la
 * réécrire ici la laisserait dériver au premier changement de gouttière.
 */
export function ProductCatalogSkeleton({ accent = "rail" }: { accent?: "rail" | "mono" }) {
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

			<section
				data-accent="rose"
				className="bg-background relative z-10 pt-[calc(var(--navbar-height-static)+0.75rem)] pb-12 lg:pb-16"
			>
				<div className="group/container mx-auto max-w-6xl space-y-5 px-4 sm:px-6 lg:px-8">
					{/* Fil d'Ariane desktop */}
					<div aria-hidden className="hidden md:block">
						<Skeleton className="h-5 w-44 rounded" />
					</div>

					{/* Bloc titre — même montage que le shell réel : plus de cluster
					    recherche/tri dans la rangée (2026-08-06). */}
					<CatalogHeadingSkeleton accent={accent} />

					{/* Barre collante — miroir de `ProductFilterBar`, `lg:hidden` comme
					    elle (à desktop, le rail porte filtres et tri). La peau vient de la
					    SSOT partagée `SHELF_BAR_SHELL` (coque sans le sticky — un squelette
					    n'a pas besoin de coller, mais doit avoir la même peau et la même
					    hauteur, sinon CLS au swap Suspense). Une seule étiquette
					    (« Filtrer »), pleine largeur sous `md`, calée à droite ensuite. */}
					<div aria-hidden className={cn(SHELF_BAR_SHELL, "lg:hidden")}>
						<div className="flex items-stretch gap-3">
							<div className="flex flex-1 items-center gap-2 py-2 md:ml-auto md:flex-none md:py-0">
								<div className="border-border bg-background flex h-11 flex-1 items-center justify-center gap-1.5 rounded-sm border px-2 md:flex-none md:px-3.5">
									<Skeleton className="size-4 rounded" />
									<Skeleton className="h-3 w-14 rounded" />
								</div>
							</div>
						</div>
					</div>

					{/* Miroir du wrapper à deux colonnes du rail (« Le plan de travail ») :
					    sans lui, la grille du squelette est pleine largeur et saute de
					    16rem au swap — sur la page dont le CLS est budgété en CI. */}
					<div className="lg:grid lg:grid-cols-[16rem_1fr] lg:items-start lg:gap-8">
						{/* Plaque « salle rose » du rail (mêmes classes que le rail réel) :
						    sans elle, le meuble teinté apparaîtrait d'un coup au swap
						    Suspense. */}
						<div aria-hidden className="hidden lg:block">
							<div className="border-primary/25 bg-primary/5 relative rounded-md border">
								{/* L'étiquette du meuble (« Le comptoir ») : titre display —
								    mêmes cotes que l'en-tête réel du rail. Pas de pied : il
								    n'apparaît qu'avec des filtres actifs. */}
								<div className="px-4 pt-3 pb-1.5">
									<Skeleton className="h-6 w-16 rounded" />
								</div>
								<div className="space-y-7 px-3 pt-1 pb-2">
									{[0, 1, 2].map((i) => (
										<div key={i} className="space-y-2">
											<Skeleton className="h-3 w-24 rounded" />
											{[0, 1, 2, 3].map((row) => (
												<Skeleton key={row} className="h-11 w-full rounded-lg" />
											))}
										</div>
									))}
								</div>
							</div>
						</div>

						<div className="min-w-0">
							<div className={CATALOG_GRID}>
								<ProductListSkeleton />
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
