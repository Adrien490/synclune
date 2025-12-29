import { DataTableSkeleton } from "@/shared/components/data-table";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function RefundsDataTableSkeleton() {
	return (
		<DataTableSkeleton
			columns={[
				{ width: "15%", cell: { type: "text", width: "w-20" } },
				{ width: "12%", hiddenBelow: "sm", cell: { type: "text", width: "w-24" } },
				{
					width: "20%",
					cell: {
						type: "custom",
						render: () => (
							<div className="space-y-1">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-3 w-40" />
							</div>
						),
					},
				},
				{ width: "15%", hiddenBelow: "md", cell: { type: "text", width: "w-28" } },
				{ width: "12%", cell: { type: "badge", width: "w-20" } },
				{ width: "10%", cell: { type: "text", width: "w-16" } },
				{ width: "10%", align: "right", cell: { type: "actions" } },
			]}
			pagination="offset"
		/>
	);
}
