import { DataTableSkeleton } from "@/shared/components/data-table";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function StockNotificationsDataTableSkeleton() {
	return (
		<DataTableSkeleton
			tableFixed={false}
			columns={[
				{ width: "5%", cell: { type: "checkbox" } },
				{
					width: "22%",
					cell: {
						type: "custom",
						render: () => (
							<div className="flex items-center gap-3">
								<Skeleton className="h-10 w-10 rounded-md" />
								<Skeleton className="h-4 w-32" />
							</div>
						),
					},
				},
				{
					width: "13%",
					cell: {
						type: "custom",
						render: () => (
							<div className="flex items-center gap-2">
								<Skeleton className="h-4 w-4 rounded-full" />
								<Skeleton className="h-4 w-16" />
							</div>
						),
					},
				},
				{ width: "18%", cell: { type: "text", width: "w-40" } },
				{ width: "10%", cell: { type: "badge", width: "w-16" } },
				{ width: "8%", align: "center", cell: { type: "text", width: "w-8" } },
				{ width: "12%", hiddenBelow: "sm", cell: { type: "text", width: "w-20" } },
				{ width: "6%", align: "right", cell: { type: "actions" } },
			]}
			pagination="offset"
		/>
	);
}
