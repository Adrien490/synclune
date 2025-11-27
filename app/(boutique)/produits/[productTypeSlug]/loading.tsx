import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state pour les pages /produits/[productTypeSlug]
 *
 * Structure correspondante à BijouxPage:
 * - PageHeader avec breadcrumbs (Bijoux > Type), titre, description et tabs horizontaux
 * - Toolbar avec SearchForm, SelectFilter et ProductFilterSheet
 * - ProductListSkeleton
 */
export default function BijouxTypeLoading() {
	return (
		<div className="min-h-screen">
			{/* PageHeader skeleton */}
			<div className="pt-16 sm:pt-20">
				{/* Header avec contexte */}
				<section className="bg-background">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-3">
						{/* Breadcrumb et titre principal */}
						<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
							<div className="space-y-2">
								{/* Breadcrumb skeleton avec 3 niveaux (Accueil / Bijoux / Type) */}
								<nav
									aria-label="Fil d'Ariane"
									className="text-sm leading-normal text-muted-foreground"
								>
									<div className="flex items-center gap-2">
										<Skeleton className="h-4 w-16" />
										<span className="text-muted-foreground">/</span>
										<Skeleton className="h-4 w-20" />
										<span className="text-muted-foreground">/</span>
										<Skeleton className="h-4 w-24" />
									</div>
								</nav>

								{/* Titre skeleton */}
								<Skeleton className="h-8 sm:h-9 w-48" />

								{/* Description skeleton */}
								<Skeleton className="h-5 w-full max-w-2xl" />
							</div>
						</div>
					</div>
				</section>

				{/* Tabs skeleton */}
				<div className="bg-background border-b border-border">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
						<div className="flex items-center gap-2 overflow-x-auto">
							{/* Onglet "mes créations" */}
							<Skeleton className="h-10 w-32 rounded-md" />
							{/* Autres onglets */}
							{Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-28 rounded-md" />
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Section principale avec catalogue */}
			<section className="bg-background py-8">
				<div className="group/container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					{/* Toolbar skeleton */}
					<div className="bg-card border border-border rounded-lg p-4 shadow-sm">
						<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between">
							{/* Section gauche - Search form skeleton */}
							<div className="flex-1 sm:max-w-md">
								<Skeleton className="h-10 w-full rounded-md" />
							</div>

							{/* Section droite - Tri et Filtres skeleton */}
							<div className="flex flex-row items-center gap-3 sm:gap-3 sm:shrink-0">
								<Skeleton className="h-10 w-40 rounded-md" />
								<Skeleton className="h-10 w-24 rounded-md" />
							</div>
						</div>
					</div>

					{/* Product list skeleton */}
					<ProductListSkeleton />
				</div>
			</section>
		</div>
	);
}
