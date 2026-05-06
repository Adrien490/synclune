import { ProductTypesMobileListSkeleton } from "@/modules/product-types/components/admin/product-types-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

/**
 * Loading state for product types management page.
 * Aligned with page.tsx: PageHeader + Toolbar + FilterBadges + MobileList + DataTable.
 */
export default function ProductTypesLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des types de produits">
			<span className="sr-only">Chargement des types de produits...</span>

			<PageHeader
				variant="compact"
				title="Types de produits"
				description="Catégoriez vos créations par type de bijou"
				actions={<Skeleton className="h-10 w-48 motion-safe:animate-pulse" />}
				className="hidden md:block"
			/>

			<div className="space-y-6">
				<ToolbarSkeleton selectCount={1} buttonCount={1} />

				{/* Filter badges placeholder */}
				<div className="min-h-[1px]" aria-hidden="true" />

				<ProductTypesMobileListSkeleton />

				{/* Desktop data table */}
				<div className="border-primary/15 from-primary/3 hidden overflow-hidden rounded-lg border-2 bg-linear-to-br to-transparent md:block">
					<div className="border-primary/10 from-primary/5 border-b-2 bg-linear-to-r to-transparent p-4">
						<div className="grid grid-cols-12 items-center gap-4">
							<Skeleton className="bg-muted/40 h-5 w-5 motion-safe:animate-pulse" />
							<Skeleton className="bg-muted/50 col-span-2 h-5 w-12 motion-safe:animate-pulse" />
							<Skeleton className="bg-muted/50 col-span-3 h-5 w-24 motion-safe:animate-pulse" />
							<Skeleton className="bg-muted/40 col-span-3 h-5 w-32 motion-safe:animate-pulse" />
							<Skeleton className="bg-muted/40 col-span-2 h-5 w-20 motion-safe:animate-pulse" />
							<Skeleton className="bg-muted/40 h-5 w-8 motion-safe:animate-pulse" />
						</div>
					</div>

					{Array.from({ length: 12 }).map((_, i) => (
						<div
							key={i}
							className="border-border hover:bg-primary/5 border-b p-4 transition-colors last:border-0"
						>
							<div className="grid grid-cols-12 items-center gap-4">
								<Skeleton className="bg-muted/30 h-5 w-5 motion-safe:animate-pulse" />
								<Skeleton className="bg-muted/40 col-span-2 h-10 w-10 rounded-full motion-safe:animate-pulse" />
								<div className="col-span-3 space-y-2">
									<Skeleton className="bg-muted/50 h-4 w-full motion-safe:animate-pulse" />
									<Skeleton className="bg-muted/30 h-3 w-24 motion-safe:animate-pulse" />
								</div>
								<Skeleton className="bg-muted/40 col-span-3 h-4 w-full motion-safe:animate-pulse" />
								<Skeleton className="bg-muted/40 col-span-2 h-4 w-12 motion-safe:animate-pulse" />
								<Skeleton className="bg-muted/30 h-8 w-8 rounded motion-safe:animate-pulse" />
							</div>
						</div>
					))}
				</div>

				{/* Pagination */}
				<div className="flex items-center justify-between">
					<Skeleton className="bg-muted/30 h-5 w-40 motion-safe:animate-pulse" />
					<div className="flex items-center gap-2">
						<Skeleton className="bg-muted/40 h-10 w-10 rounded-md motion-safe:animate-pulse" />
						<Skeleton className="bg-muted/40 h-10 w-32 rounded-md motion-safe:animate-pulse" />
						<Skeleton className="bg-muted/40 h-10 w-10 rounded-md motion-safe:animate-pulse" />
					</div>
				</div>
			</div>
		</div>
	);
}
