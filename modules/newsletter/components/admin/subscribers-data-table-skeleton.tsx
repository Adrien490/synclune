import { DataTableSkeleton } from "@/shared/components/data-table";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function SubscribersDataTableSkeleton() {
	return (
		<DataTableSkeleton
			tableFixed={false}
			columns={[
				{ width: "35%", cell: { type: "text", width: "w-48" } },
				{
					width: "20%",
					cell: {
						type: "custom",
						render: () => (
							<div className="flex items-center gap-1.5">
								<Skeleton className="h-4 w-4 rounded-full" />
								<Skeleton className="h-4 w-16" />
							</div>
						),
					},
				},
				{ width: "25%", hiddenBelow: "sm", cell: { type: "text", width: "w-24" } },
				{ width: "20%", hiddenBelow: "md", cell: { type: "text", width: "w-24" } },
			]}
			pagination="offset"
		/>
	);
}
