import { DataTableSkeleton } from "@/shared/components/data-table";
import { Skeleton } from "@/shared/components/ui/skeleton";

/** Grille alignée sur `refunds-data-table.tsx` (7 colonnes, pagination curseur). */
export function RefundsDataTableSkeleton() {
	return (
		<DataTableSkeleton
			className="hidden md:block"
			columns={[
				{ width: "14%", cell: { type: "text", width: "w-20" } },
				{ width: "12%", cell: { type: "text", width: "w-24" } },
				{
					width: "24%",
					cell: {
						type: "custom",
						render: () => (
							<div className="space-y-1">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-3 w-40" />
							</div>
						),
					},
				},
				{ width: "16%", cell: { type: "text", width: "w-28" } },
				{ width: "12%", cell: { type: "badge", width: "w-20" } },
				{ width: "12%", align: "right", cell: { type: "text", width: "w-16" } },
				{ width: "10%", align: "right", cell: { type: "actions" } },
			]}
			pagination="cursor"
		/>
	);
}
