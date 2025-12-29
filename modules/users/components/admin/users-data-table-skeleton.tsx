import { DataTableSkeleton } from "@/shared/components/data-table";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function UsersDataTableSkeleton() {
	return (
		<DataTableSkeleton
			columns={[
				{ width: "8%", cell: { type: "avatar" } },
				{ width: "20%", cell: { type: "text", width: "w-28" } },
				{
					width: "30%",
					cell: {
						type: "custom",
						render: () => (
							<div className="flex items-center gap-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-4 w-4 rounded-full shrink-0" />
							</div>
						),
					},
				},
				{ width: "12%", hiddenBelow: "xl", cell: { type: "text", width: "w-6" } },
				{ width: "15%", hiddenBelow: "sm", cell: { type: "text", width: "w-20" } },
				{ width: "5%", align: "right", cell: { type: "actions" } },
			]}
			pagination="offset"
		/>
	);
}
