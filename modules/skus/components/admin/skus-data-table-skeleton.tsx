import { DataTableSkeleton } from "@/shared/components/data-table";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function SkusDataTableSkeleton() {
	return (
		<DataTableSkeleton
			tableFixed={false}
			columns={[
				{ cell: { type: "checkbox" } },
				{ hiddenBelow: "md", cell: { type: "image" } },
				{
					cell: {
						type: "custom",
						render: () => (
							<div className="flex flex-col gap-1">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-5 w-16 rounded-full" />
							</div>
						),
					},
				},
				{
					hiddenBelow: "sm",
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
				{ hiddenBelow: "xl", cell: { type: "text", width: "w-20" } },
				{ hiddenBelow: "2xl", cell: { type: "text", width: "w-12" } },
				{ cell: { type: "text", width: "w-16" } },
				{ hiddenBelow: "xl", cell: { type: "text", width: "w-14" } },
				{ hiddenBelow: "sm", align: "center", cell: { type: "text", width: "w-8" } },
				{ align: "right", cell: { type: "actions" } },
			]}
			pagination="cursor"
		/>
	);
}
