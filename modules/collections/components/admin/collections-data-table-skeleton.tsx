import { DataTableSkeleton } from "@/shared/components/data-table";

export function CollectionsDataTableSkeleton() {
	return (
		<DataTableSkeleton
			columns={[
				{ width: "5%", cell: { type: "checkbox" } },
				{ width: "30%", cell: { type: "text", width: "w-32" } },
				{ width: "15%", hiddenBelow: "sm", cell: { type: "badge", width: "w-16" } },
				{ width: "25%", hiddenBelow: "xl", cell: { type: "text", width: "w-full" } },
				{ width: "12%", hiddenBelow: "sm", align: "center", cell: { type: "text", width: "w-8" } },
				{ width: "10%", align: "right", cell: { type: "actions" } },
			]}
			pagination="offset"
		/>
	);
}
