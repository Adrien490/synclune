import { CollectionsDataTableSkeleton } from "@/modules/collections/components/admin/collections-data-table-skeleton";
import { CollectionsMobileListSkeleton } from "@/modules/collections/components/admin/collections-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

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
				<div className="hidden gap-2 md:flex md:items-center">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-9 w-24 rounded-md" />
					))}
				</div>

				<ToolbarSkeleton selectCount={2} buttonCount={1} />

				<div className="min-h-[1px]" aria-hidden="true" />

				<CollectionsMobileListSkeleton />
				<CollectionsDataTableSkeleton />
			</div>
		</div>
	);
}
