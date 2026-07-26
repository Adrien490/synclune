import { DataTableSkeleton } from "@/shared/components/data-table";

/** Grille alignée sur `discounts-data-table.tsx` (6 colonnes, pagination curseur). */
export function DiscountsDataTableSkeleton() {
	return (
		<DataTableSkeleton
			className="hidden md:block"
			columns={[
				{ width: "22%", cell: { type: "badge", width: "w-24" } },
				{ width: "16%", cell: { type: "text", width: "w-20" } },
				{ width: "14%", cell: { type: "text", width: "w-12" } },
				{ width: "18%", align: "center", cell: { type: "text", width: "w-16" } },
				{ width: "18%", align: "center", cell: { type: "badge", width: "w-20" } },
				{ width: "12%", align: "right", cell: { type: "actions" } },
			]}
			pagination="cursor"
		/>
	);
}
