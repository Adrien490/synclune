import { MaterialsMobileListSkeleton } from "@/modules/materials/components/admin/materials-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

/**
 * Loading state for materials management page.
 * Aligned with page.tsx: PageHeader + Toolbar + FilterBadges + MobileList + DataTable.
 */
export default function MaterialsManagementLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des matériaux">
			<span className="sr-only">Chargement des matériaux...</span>

			<PageHeader
				variant="compact"
				title="Matériaux"
				description="Gérez les matériaux disponibles pour vos créations"
				actions={<Skeleton className="h-10 w-40 motion-safe:animate-pulse" />}
				className="hidden md:block"
			/>

			<div className="space-y-6">
				<ToolbarSkeleton selectCount={1} buttonCount={1} />

				{/* Filter badges placeholder */}
				<div className="min-h-[1px]" aria-hidden="true" />

				<MaterialsMobileListSkeleton />

				{/* Desktop table */}
				<div className="bg-card hidden rounded-lg border md:block">
					<div className="p-6">
						<div className="mb-4 flex items-center gap-4 border-b pb-4">
							<Skeleton className="h-4 w-4 motion-safe:animate-pulse" />
							<Skeleton className="h-4 w-32 motion-safe:animate-pulse" />
							<Skeleton className="hidden h-4 w-48 motion-safe:animate-pulse md:block" />
							<Skeleton className="hidden h-4 w-16 motion-safe:animate-pulse sm:block" />
							<Skeleton className="hidden h-4 w-16 motion-safe:animate-pulse sm:block" />
							<Skeleton className="ml-auto h-4 w-8 motion-safe:animate-pulse" />
						</div>

						{Array.from({ length: 10 }).map((_, i) => (
							<div key={i} className="flex items-center gap-4 border-b py-4 last:border-0">
								<Skeleton className="h-4 w-4 motion-safe:animate-pulse" />
								<Skeleton className="h-4 w-32 motion-safe:animate-pulse" />
								<Skeleton className="hidden h-4 w-48 motion-safe:animate-pulse md:block" />
								<Skeleton className="hidden h-5 w-12 motion-safe:animate-pulse sm:block" />
								<Skeleton className="hidden h-4 w-8 motion-safe:animate-pulse sm:block" />
								<Skeleton className="ml-auto h-8 w-8 motion-safe:animate-pulse" />
							</div>
						))}
					</div>
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
