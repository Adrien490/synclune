import { DataTableSkeleton } from "@/shared/components/data-table";

export function ColorsDataTableSkeleton() {
	return (
		<DataTableSkeleton
			columns={[
				{ width: "5%", cell: { type: "checkbox" } },
				{ width: "10%", hiddenBelow: "md", cell: { type: "avatar", size: 8 } },
				{ width: "30%", cell: { type: "text", width: "w-32" } },
				{ width: "12%", hiddenBelow: "lg", cell: { type: "text", width: "w-20" } },
				{ width: "10%", hiddenBelow: "sm", align: "center", cell: { type: "text", width: "w-8" } },
				{ width: "10%", align: "right", cell: { type: "actions" } },
			]}
			pagination="offset"
		/>
	);
}
