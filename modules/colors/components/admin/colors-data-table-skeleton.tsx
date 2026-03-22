import { DataTableSkeleton } from "@/shared/components/data-table";

export function ColorsDataTableSkeleton() {
	return (
		<DataTableSkeleton
			className="hidden md:block"
			columns={[
				{ width: "5%", cell: { type: "checkbox" } },
				{ width: "10%", cell: { type: "avatar", size: 8 } },
				{ width: "30%", cell: { type: "text", width: "w-32" } },
				{ width: "10%", align: "center", cell: { type: "text", width: "w-8" } },
				{ width: "10%", align: "center", cell: { type: "text", width: "w-10" } },
				{ width: "10%", align: "right", cell: { type: "actions" } },
			]}
			pagination="cursor"
		/>
	);
}
