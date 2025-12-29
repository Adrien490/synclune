import { DataTableSkeleton } from "@/shared/components/data-table";

export function ProductsDataTableSkeleton() {
	return (
		<DataTableSkeleton
			columns={[
				{ width: "5%", cell: { type: "checkbox" } },
				{ width: "10%", hiddenBelow: "md", cell: { type: "image" } },
				{ width: "25%", cell: { type: "text", width: "w-32" } },
				{ width: "12%", hiddenBelow: "lg", cell: { type: "badge", width: "w-20" } },
				{ width: "8%", hiddenBelow: "sm", align: "center", cell: { type: "text", width: "w-8" } },
				{ width: "12%", hiddenBelow: "lg", align: "right", cell: { type: "text", width: "w-24" } },
				{ width: "8%", hiddenBelow: "lg", align: "center", cell: { type: "badge", width: "w-12" } },
				{ width: "10%", align: "right", cell: { type: "actions" } },
			]}
			pagination="cursor"
		/>
	);
}
