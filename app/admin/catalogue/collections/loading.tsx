import { CollectionsMobileListSkeleton } from "@/modules/collections/components/admin/collections-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

/**
 * Loading state for collections management page.
 * Aligned with page.tsx structure: PageHeader + StatusNav + Toolbar + MobileList + DataTable.
 */
export default function CollectionsManagementLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des collections">
			<span className="sr-only">Chargement des collections...</span>

			<PageHeader
				variant="compact"
				title="Collections"
				description="Gérez vos collections de bijoux"
				className="hidden md:block"
			/>

			<div className="space-y-6">
				{/* Status navigation tabs (desktop) */}
				<div className="hidden md:flex md:gap-2">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton
							key={i}
							className="bg-muted/40 h-9 w-24 rounded-md motion-safe:animate-pulse"
						/>
					))}
				</div>

				{/* Toolbar */}
				<ToolbarSkeleton selectCount={2} buttonCount={1} />

				{/* Filter badges placeholder (réserve la hauteur si filtres actifs) */}
				<div className="min-h-[1px]" aria-hidden="true" />

				{/* Mobile list (md:hidden inside skeleton) */}
				<CollectionsMobileListSkeleton />

				{/* Data Table (desktop) */}
				<div className="border-primary/15 from-primary/3 hidden overflow-hidden rounded-lg border-2 bg-linear-to-br to-transparent md:block">
					<div className="border-primary/10 from-primary/5 border-b-2 bg-linear-to-r to-transparent p-4">
						<div className="flex items-center gap-4">
							<Skeleton className="bg-muted/40 h-5 w-5 motion-safe:animate-pulse" />
							<Skeleton className="bg-muted/50 h-5 w-32 motion-safe:animate-pulse" />
							<Skeleton className="bg-muted/40 h-5 w-48 flex-1 motion-safe:animate-pulse" />
							<Skeleton className="bg-muted/40 h-5 w-24 motion-safe:animate-pulse" />
							<Skeleton className="bg-muted/40 h-5 w-20 motion-safe:animate-pulse" />
						</div>
					</div>

					{Array.from({ length: 10 }).map((_, i) => (
						<div
							key={i}
							className="border-border hover:bg-primary/5 border-b p-4 transition-colors last:border-0"
						>
							<div className="flex items-center gap-4">
								<Skeleton className="bg-muted/30 h-5 w-5 motion-safe:animate-pulse" />
								<Skeleton className="bg-muted/40 h-12 w-12 rounded-md motion-safe:animate-pulse" />
								<div className="flex-1 space-y-2">
									<Skeleton className="bg-muted/50 h-4 w-48 motion-safe:animate-pulse" />
									<Skeleton className="bg-muted/30 h-3 w-32 motion-safe:animate-pulse" />
								</div>
								<Skeleton className="bg-muted/40 h-6 w-16 rounded-full motion-safe:animate-pulse" />
								<Skeleton className="bg-muted/30 h-8 w-8 rounded motion-safe:animate-pulse" />
							</div>
						</div>
					))}
				</div>

				{/* Pagination */}
				<div className="flex items-center justify-between">
					<Skeleton className="bg-muted/30 h-5 w-32 motion-safe:animate-pulse" />
					<div className="flex items-center gap-2">
						<Skeleton className="bg-muted/40 h-10 w-10 rounded-md motion-safe:animate-pulse" />
						<Skeleton className="bg-muted/40 h-10 w-10 rounded-md motion-safe:animate-pulse" />
					</div>
				</div>
			</div>
		</div>
	);
}
