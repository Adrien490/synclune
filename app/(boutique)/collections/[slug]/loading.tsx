import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for collection detail page
 * Reproduit exactement la structure de la page collection avec PageHeader et ProductList
 */
export default function CollectionDetailLoading() {
	return (
		<div
			className="min-h-screen"
			role="status"
			aria-busy="true"
			aria-label="Chargement de la collection"
		>
			<span className="sr-only">Chargement de la collection...</span>

			{/* PageHeader Skeleton - Structure exacte avec pt-16, border-b, breadcrumbs */}
			<div className="pt-16 sm:pt-20">
				<section className="bg-background border-b border-border">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
						<div className="space-y-2">
							{/* Breadcrumbs skeleton */}
							<nav className="text-sm">
								<div className="flex items-center gap-2">
									<Skeleton className="h-4 w-24 bg-muted/40" />
									<span className="text-muted-foreground">/</span>
									<Skeleton className="h-4 w-32 bg-muted/50" />
								</div>
							</nav>

							{/* Title skeleton */}
							<Skeleton className="h-8 sm:h-9 w-48 bg-muted/50" />

							{/* Description skeleton (optionnelle) */}
							<div className="pt-2 space-y-2">
								<Skeleton className="h-4 w-full max-w-2xl bg-muted/30" />
								<Skeleton className="h-4 w-2/3 max-w-xl bg-muted/30" />
							</div>
						</div>
					</div>
				</section>
			</div>

			{/* Section principale avec catalogue - Structure exacte */}
			<section className="bg-background pt-6 pb-12 lg:pt-8 lg:pb-16">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					{/* Toolbar skeleton */}
					<div className="rounded-lg bg-card border border-border/60 p-4 shadow-sm">
						<div className="flex flex-row gap-2 items-center w-full">
							<div className="flex-1 min-w-0">
								<Skeleton className="h-10 w-full rounded-md" />
							</div>
							<div className="flex flex-row items-center gap-2 shrink-0">
								<Skeleton className="h-10 w-[140px] rounded-md" />
							</div>
						</div>
					</div>

					{/* ProductList avec grille et pagination */}
					<ProductListSkeleton />
				</div>
			</section>
		</div>
	);
}
