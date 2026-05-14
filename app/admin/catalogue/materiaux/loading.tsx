import { MaterialsDataTableSkeleton } from "@/modules/materials/components/admin/materials-data-table-skeleton";
import { MaterialsMobileListSkeleton } from "@/modules/materials/components/admin/materials-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { StickyActionBarSkeleton } from "@/shared/components/sticky-action-bar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

export default function MaterialsManagementLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des matériaux" className="space-y-6">
			<span className="sr-only">Chargement des matériaux…</span>

			<PageHeader
				variant="compact"
				title="Matériaux"
				actions={<Skeleton className="h-10 w-40" />}
				className="hidden md:block"
			/>

			<StickyActionBarSkeleton itemCount={4} />

			<ToolbarSkeleton selectCount={1} buttonCount={2} className="hidden md:flex" />

			<div className="min-h-[1px]" aria-hidden="true" />

			<MaterialsMobileListSkeleton />
			<MaterialsDataTableSkeleton />
		</div>
	);
}
