import { CollectionsDataTableSkeleton } from "@/modules/collections/components/admin/collections-data-table-skeleton";
import { CollectionsMobileListSkeleton } from "@/modules/collections/components/admin/collections-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

export default function CollectionsManagementLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement des collections"
			className="space-y-6"
		>
			<span className="sr-only">Chargement des collections…</span>

			<PageHeader
				variant="compact"
				title="Collections"
				actions={<Skeleton className="h-10 w-48" />}
				className="hidden md:block"
			/>

			<ToolbarSkeleton selectCount={1} buttonCount={2} className="hidden md:flex" />

			<div className="min-h-[1px]" aria-hidden="true" />

			<CollectionsMobileListSkeleton />
			<CollectionsDataTableSkeleton />
		</div>
	);
}
