import { DataTableSkeleton } from "@/shared/components/data-table";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function ProductTypesDataTableSkeleton() {
	return (
		<DataTableSkeleton
			columns={[
				{ width: "5%", cell: { type: "checkbox" } },
				{ width: "40%", cell: { type: "text", width: "w-32" } },
				{ width: "15%", hiddenBelow: "sm", align: "center", cell: { type: "text", width: "w-8" } },
				{
					width: "15%",
					hiddenBelow: "sm",
					align: "center",
					cell: {
						type: "custom",
						render: () => <Skeleton className="h-6 w-11 mx-auto rounded-full" />,
					},
				},
				{ width: "15%", align: "right", cell: { type: "actions" } },
			]}
			pagination="offset"
		/>
	);
}
