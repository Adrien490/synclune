import { MaterialsDataTableSkeleton } from "@/modules/materials/components/admin/materials-data-table-skeleton";
import { MaterialsMobileListSkeleton } from "@/modules/materials/components/admin/materials-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

export default function MaterialsManagementLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des matériaux">
			<span className="sr-only">Chargement des matériaux...</span>

			<PageHeader
				variant="compact"
				title="Matériaux"
				description="Gérez les matériaux disponibles pour vos créations"
				actions={<Skeleton className="h-10 w-40" />}
				className="hidden md:block"
			/>

			<div className="space-y-6">
				<ToolbarSkeleton selectCount={1} buttonCount={1} />

				<div className="min-h-[1px]" aria-hidden="true" />

				<MaterialsMobileListSkeleton />
				<MaterialsDataTableSkeleton />
			</div>
		</div>
	);
}
