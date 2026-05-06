import { SkusMobileListSkeleton } from "@/modules/skus/components/admin/skus-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

/**
 * Loading skeleton pour la page de liste des variantes (SKUs).
 * Aligned with page.tsx: Breadcrumb + PageHeader + BottomBar + Toolbar + MobileList + DataTable.
 */
export default function ProductVariantsLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des variantes" className="space-y-6">
			<span className="sr-only">Chargement des variantes...</span>

			{/* Breadcrumb (desktop) — réserve la hauteur même si le slug n'est pas connu */}
			<div className="hidden md:flex md:items-center md:gap-2">
				<Skeleton className="bg-muted/40 h-4 w-12 motion-safe:animate-pulse" />
				<span className="text-muted-foreground">/</span>
				<Skeleton className="bg-muted/40 h-4 w-20 motion-safe:animate-pulse" />
				<span className="text-muted-foreground">/</span>
				<Skeleton className="bg-muted/40 h-4 w-32 motion-safe:animate-pulse" />
				<span className="text-muted-foreground">/</span>
				<Skeleton className="bg-muted/40 h-4 w-24 motion-safe:animate-pulse" />
			</div>

			<PageHeader
				variant="compact"
				title="Variantes du produit"
				description="Gérez les déclinaisons de ce produit"
				actions={<Skeleton className="h-10 w-44 motion-safe:animate-pulse" />}
				className="hidden md:block"
			/>

			<ToolbarSkeleton selectCount={1} buttonCount={1} />

			{/* Filter badges placeholder */}
			<div className="min-h-[1px]" aria-hidden="true" />

			<SkusMobileListSkeleton />

			{/* Desktop data table */}
			<div className="hidden rounded-md border md:block">
				<div className="bg-muted/50 border-b p-4">
					<div className="flex items-center gap-4">
						<Skeleton className="h-4 w-4 motion-safe:animate-pulse" />
						<div className="w-[10%]">
							<Skeleton className="h-4 w-12 motion-safe:animate-pulse" />
						</div>
						<div className="flex-1">
							<Skeleton className="h-4 w-32 motion-safe:animate-pulse" />
						</div>
						<div className="w-[10%] text-center">
							<Skeleton className="mx-auto h-4 w-16 motion-safe:animate-pulse" />
						</div>
						<div className="w-[10%] text-center">
							<Skeleton className="mx-auto h-4 w-12 motion-safe:animate-pulse" />
						</div>
						<div className="w-[8%]">
							<Skeleton className="ml-auto h-4 w-16 motion-safe:animate-pulse" />
						</div>
					</div>
				</div>

				<div className="divide-y">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="p-4">
							<div className="flex items-center gap-4">
								<Skeleton className="h-4 w-4 motion-safe:animate-pulse" />
								<div className="w-[10%]">
									<Skeleton className="h-12 w-12 rounded-md motion-safe:animate-pulse" />
								</div>
								<div className="flex-1 space-y-1">
									<div className="flex items-center gap-2">
										<Skeleton className="h-4 w-4 rounded-full motion-safe:animate-pulse" />
										<Skeleton className="h-4 w-24 motion-safe:animate-pulse" />
									</div>
									<Skeleton className="h-3 w-32 motion-safe:animate-pulse" />
								</div>
								<div className="flex w-[10%] justify-center">
									<Skeleton className="h-6 w-11 rounded-full motion-safe:animate-pulse" />
								</div>
								<div className="flex w-[10%] justify-center">
									<Skeleton className="h-4 w-8 motion-safe:animate-pulse" />
								</div>
								<div className="flex w-[8%] justify-end">
									<Skeleton className="h-8 w-8 rounded-md motion-safe:animate-pulse" />
								</div>
							</div>
						</div>
					))}
				</div>

				<div className="border-t p-4">
					<div className="flex items-center justify-between">
						<Skeleton className="h-4 w-40 motion-safe:animate-pulse" />
						<div className="flex items-center gap-2">
							<Skeleton className="h-9 w-24 motion-safe:animate-pulse" />
							<Skeleton className="h-9 w-24 motion-safe:animate-pulse" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
