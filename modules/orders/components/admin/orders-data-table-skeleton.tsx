import { DataTableSkeleton } from "@/shared/components/data-table";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function OrdersDataTableSkeleton() {
	return (
		<DataTableSkeleton
			columns={[
				{ width: "5%", cell: { type: "checkbox" } },
				{ width: "10%", cell: { type: "text", width: "w-20" } },
				{ width: "10%", hiddenBelow: "sm", cell: { type: "text", width: "w-28" } },
				{
					width: "15%",
					cell: {
						type: "custom",
						render: () => (
							<div className="flex items-center gap-2">
								<Skeleton className="h-8 w-8 rounded-full" />
								<Skeleton className="h-4 w-24" />
							</div>
						),
					},
				},
				{ width: "10%", hiddenBelow: "sm", cell: { type: "badge", width: "w-20" } },
				{ width: "10%", hiddenBelow: "lg", cell: { type: "badge", width: "w-20" } },
				{ width: "8%", cell: { type: "text", width: "w-16" } },
				{ width: "10%", align: "right", cell: { type: "actions" } },
			]}
			pagination="offset"
		/>
	);
}
