import { DataTableSkeleton } from "@/shared/components/data-table";

export function CustomizationsDataTableSkeleton() {
	return (
		<DataTableSkeleton
			className="hidden md:block"
			columns={[
				{ width: "4%", cell: { type: "checkbox" } },
				{ width: "18%", cell: { type: "text", width: "w-24" } },
				{ width: "14%", cell: { type: "text", width: "w-20" } },
				{ width: "14%", cell: { type: "badge", width: "w-20" } },
				{ width: "10%", cell: { type: "text", width: "w-16" } },
				{ width: "5%", cell: { type: "text", width: "w-4" } },
				{ width: "12%", cell: { type: "text", width: "w-20" } },
				{ width: "8%", align: "right", cell: { type: "actions" } },
			]}
			pagination="cursor"
		/>
	);
}
