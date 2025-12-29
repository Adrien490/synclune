import { DataTableSkeleton } from "@/shared/components/data-table";

export function MaterialsDataTableSkeleton() {
	return (
		<DataTableSkeleton
			columns={[
				{ width: "5%", cell: { type: "checkbox" } },
				{ width: "30%", cell: { type: "text", width: "w-32" } },
				{ width: "30%", hiddenBelow: "md", cell: { type: "text", width: "w-48" } },
				{ width: "10%", hiddenBelow: "sm", align: "center", cell: { type: "text", width: "w-12" } },
				{ width: "10%", hiddenBelow: "sm", align: "center", cell: { type: "text", width: "w-8" } },
				{ width: "10%", align: "right", cell: { type: "actions" } },
			]}
			pagination="offset"
		/>
	);
}
