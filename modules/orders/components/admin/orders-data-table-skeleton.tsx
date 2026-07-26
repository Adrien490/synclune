import { DataTableSkeleton } from "@/shared/components/data-table";

/** Grille alignée sur `orders-data-table.tsx` (7 colonnes, pagination curseur). */
export function OrdersDataTableSkeleton() {
	return (
		<DataTableSkeleton
			className="hidden md:block"
			columns={[
				{ width: "14%", cell: { type: "text", width: "w-20" } },
				{ width: "22%", cell: { type: "text", width: "w-32" } },
				{ width: "12%", cell: { type: "text", width: "w-24" } },
				{ width: "14%", cell: { type: "badge", width: "w-20" } },
				{ width: "14%", cell: { type: "badge", width: "w-24" } },
				{ width: "14%", align: "right", cell: { type: "text", width: "w-16" } },
				{ width: "10%", align: "right", cell: { type: "actions" } },
			]}
			pagination="cursor"
		/>
	);
}
