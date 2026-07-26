import { DataTableSkeleton } from "@/shared/components/data-table";

/** Grille alignée sur `products-data-table.tsx` (7 colonnes, pagination curseur). */
export function ProductsDataTableSkeleton() {
	return (
		<DataTableSkeleton
			className="hidden md:block"
			columns={[
				{ width: "8%", cell: { type: "image" } },
				{ width: "32%", cell: { type: "text", width: "w-32" } },
				{ width: "14%", cell: { type: "badge", width: "w-20" } },
				{ width: "10%", align: "center", cell: { type: "text", width: "w-8" } },
				{ width: "14%", align: "right", cell: { type: "text", width: "w-24" } },
				{ width: "10%", align: "center", cell: { type: "badge", width: "w-12" } },
				{ width: "12%", align: "right", cell: { type: "actions" } },
			]}
			pagination="cursor"
		/>
	);
}
