import { DataTableSkeleton } from "@/shared/components/data-table";
import { Skeleton } from "@/shared/components/ui/skeleton";

/** Grille alignée sur `materials-data-table.tsx` (5 colonnes, pagination curseur). */
export function MaterialsDataTableSkeleton() {
	return (
		<DataTableSkeleton
			className="hidden md:block"
			columns={[
				{ width: "28%", cell: { type: "text", width: "w-32" } },
				{ width: "36%", cell: { type: "text", width: "w-48" } },
				{
					width: "12%",
					align: "center",
					cell: {
						type: "custom",
						render: () => <Skeleton className="mx-auto h-6 w-11 rounded-full" />,
					},
				},
				{ width: "12%", align: "center", cell: { type: "text", width: "w-8" } },
				{ width: "12%", align: "right", cell: { type: "actions" } },
			]}
			pagination="cursor"
		/>
	);
}
