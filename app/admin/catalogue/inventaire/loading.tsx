import { PageHeader } from "@/shared/components/page-header";
import { InventoryDataTableSkeleton } from "@/modules/skus/components/admin/inventory-data-table-skeleton";
import { DataTableToolbar } from "@/shared/components/data-table-toolbar";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function InventoryLoading() {
	return (
		<>
			<PageHeader
				variant="compact"
				title="Inventaire"
				description="Gérez le stock de tous vos produits depuis une seule vue"
			/>

			<div className="space-y-6">
				<DataTableToolbar ariaLabel="Barre d'outils de gestion de l'inventaire">
					<div className="flex-1 w-full sm:max-w-md min-w-0">
						<Skeleton className="h-10 w-full" />
					</div>

					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
						<Skeleton className="h-10 w-full sm:w-[160px]" />
						<Skeleton className="h-10 w-full sm:w-[200px]" />
						<Skeleton className="h-10 w-10" />
					</div>
				</DataTableToolbar>

				<InventoryDataTableSkeleton />
			</div>
		</>
	);
}
