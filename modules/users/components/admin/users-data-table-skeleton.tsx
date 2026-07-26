import { DataTableSkeleton } from "@/shared/components/data-table";
import { Skeleton } from "@/shared/components/ui/skeleton";

/** Grille alignée sur `users-data-table.tsx` (5 colonnes, pagination curseur). */
export function UsersDataTableSkeleton() {
	return (
		<DataTableSkeleton
			className="hidden md:block"
			columns={[
				{ width: "26%", cell: { type: "text", width: "w-28" } },
				{
					width: "36%",
					cell: {
						type: "custom",
						render: () => (
							<div className="flex items-center gap-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="size-4 shrink-0 rounded-full" />
							</div>
						),
					},
				},
				{ width: "12%", cell: { type: "text", width: "w-6" } },
				{ width: "16%", cell: { type: "text", width: "w-20" } },
				{ width: "10%", align: "right", cell: { type: "actions" } },
			]}
			pagination="cursor"
		/>
	);
}
