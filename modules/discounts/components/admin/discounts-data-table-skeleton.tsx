import { DataTableSkeleton } from "@/shared/components/data-table";

export function DiscountsDataTableSkeleton() {
	return (
		<DataTableSkeleton
			className="hidden md:block"
			columns={[
				{ width: "5%", cell: { type: "checkbox" } },
				{ width: "20%", cell: { type: "badge", width: "w-24" } },
				{ width: "15%", cell: { type: "text", width: "w-20" } },
				{ width: "12%", cell: { type: "text", width: "w-12" } },
				{ width: "15%", cell: { type: "text", width: "w-16" } },
				{ width: "18%", cell: { type: "text", width: "w-28" } },
				{ width: "10%", cell: { type: "text", width: "w-14" } },
				{ width: "10%", cell: { type: "actions" } },
			]}
			pagination="cursor"
		/>
	);
}
