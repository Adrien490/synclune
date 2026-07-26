import { DataTableSkeleton } from "@/shared/components/data-table";

/** Grille alignée sur `collections-data-table.tsx` (5 colonnes, pagination curseur). */
export function CollectionsDataTableSkeleton() {
	return (
		<DataTableSkeleton
			className="hidden md:block"
			columns={[
				{ width: "30%", cell: { type: "text", width: "w-32" } },
				{ width: "14%", cell: { type: "badge", width: "w-16" } },
				{ width: "32%", cell: { type: "text", width: "w-full" } },
				{ width: "12%", align: "center", cell: { type: "text", width: "w-8" } },
				{ width: "12%", align: "right", cell: { type: "actions" } },
			]}
			pagination="cursor"
		/>
	);
}
