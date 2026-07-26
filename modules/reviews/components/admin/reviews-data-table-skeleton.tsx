import { DataTableSkeleton } from "@/shared/components/data-table";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Grille alignée sur `reviews-data-table.tsx` (7 colonnes, pagination curseur).
 *
 * Passe par `DataTableSkeleton` comme les 10 autres listes : la version faite
 * main ne rendait aucun placeholder de pagination, ce qui décalait la carte au
 * moment où la vraie barre curseur apparaissait.
 */
export function ReviewsDataTableSkeleton() {
	return (
		<DataTableSkeleton
			className="hidden md:block"
			columns={[
				{ width: "24%", cell: { type: "text", width: "w-32" } },
				{
					width: "18%",
					cell: {
						type: "custom",
						render: () => (
							<div className="space-y-1">
								<Skeleton className="h-3 w-20" />
								<Skeleton className="h-3 w-28" />
							</div>
						),
					},
				},
				{ width: "10%", cell: { type: "text", width: "w-16" } },
				{ width: "12%", cell: { type: "badge", width: "w-16" } },
				{ width: "12%", cell: { type: "text", width: "w-20" } },
				{ width: "12%", cell: { type: "badge", width: "w-14" } },
				{ width: "12%", align: "right", cell: { type: "actions" } },
			]}
			pagination="cursor"
		/>
	);
}
