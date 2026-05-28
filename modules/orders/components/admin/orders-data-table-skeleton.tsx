import { DataTableSkeleton } from "@/shared/components/data-table";

export function OrdersDataTableSkeleton() {
	return (
		<DataTableSkeleton
			className="hidden md:block"
			columns={[
				{ width: "4%", cell: { type: "checkbox" } },
				{ width: "12%", cell: { type: "text", width: "w-20" } },
				{ width: "15%", cell: { type: "text", width: "w-32" } },
				{ width: "10%", cell: { type: "text", width: "w-24" } },
				{ width: "12%", cell: { type: "badge", width: "w-20" } },
				{ width: "12%", cell: { type: "badge", width: "w-24" } },
				{ width: "12%", align: "right", cell: { type: "text", width: "w-16" } },
				{ width: "8%", align: "right", cell: { type: "actions" } },
			]}
			pagination="offset"
		/>
	);
}
