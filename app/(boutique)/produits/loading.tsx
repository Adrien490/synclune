import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state pour la page /produits
 *
 * Structure correspondante à BijouxPage:
 * - Mobile: Bouton retour + Titre + Actions (Sort/Search)
 * - Desktop: Breadcrumb + Titre + Description + Toolbar
 * - ProductListSkeleton
 */
export default function BijouxHubLoading() {
	return (
		<div className="min-h-screen">
			{/* PageHeader skeleton */}
			<header className="relative overflow-hidden bg-background sm:border-b sm:border-border">
				<div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-32 pb-0 sm:pb-4">
					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
						<div className="min-w-0 flex-1">
							{/* Mobile: Bouton retour + Titre + Actions */}
							<div className="flex items-center gap-1 sm:hidden">
								<Skeleton className="size-9 rounded-md" />
								<Skeleton className="h-7 flex-1 max-w-[200px] rounded" />
								{/* Actions mobile - Sort et Search */}
								<div className="flex items-center gap-2 ml-auto">
									<Skeleton className="size-11 rounded-md" />
									<Skeleton className="size-11 rounded-md" />
								</div>
							</div>

							{/* Desktop: Breadcrumb + Titre + Description */}
							<div className="hidden sm:block space-y-2">
								<nav
									aria-label="Fil d'Ariane"
									className="text-sm leading-normal text-muted-foreground"
								>
									<div className="flex items-center gap-2">
										<Skeleton className="h-4 w-16" />
										<span className="text-muted-foreground">/</span>
										<Skeleton className="h-4 w-24" />
									</div>
								</nav>
								<Skeleton className="h-8 w-64" />
								<Skeleton className="h-5 w-full max-w-2xl" />
							</div>
						</div>
					</div>
				</div>
			</header>

			{/* Section principale avec catalogue */}
			<section className="bg-background pt-4 pb-12 lg:pt-6 lg:pb-16 relative z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					{/* Toolbar skeleton - Desktop only */}
					<div className="hidden md:flex bg-card border border-border rounded-lg p-4 shadow-sm">
						<div className="flex flex-row gap-3 sm:gap-4 items-center justify-between w-full">
							{/* Search form skeleton */}
							<div className="flex-1 max-w-md">
								<Skeleton className="h-[44px] w-full rounded-md" />
							</div>
							{/* Sort + Filter skeleton */}
							<div className="flex items-center gap-3">
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
