import { DataTableSkeleton } from "@/shared/components/data-table";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Grille alignée sur `skus-data-table.tsx` (8 colonnes, `table-fixed`,
 * pagination curseur).
 */
export function SkusDataTableSkeleton() {
	return (
		<DataTableSkeleton
			className="hidden md:block"
			columns={[
				{ width: "10%", cell: { type: "image" } },
				{
					width: "20%",
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
					width: "14%",
					cell: {
						type: "custom",
						render: () => (
							<div className="flex items-center gap-2">
								<Skeleton className="size-4 rounded-full" />
								<Skeleton className="h-4 w-16" />
							</div>
						),
					},
				},
				{ width: "14%", cell: { type: "text", width: "w-20" } },
				{ width: "8%", cell: { type: "text", width: "w-12" } },
				{ width: "12%", align: "right", cell: { type: "text", width: "w-16" } },
				{ width: "12%", align: "center", cell: { type: "badge", width: "w-8" } },
				{ width: "10%", align: "right", cell: { type: "actions" } },
			]}
			pagination="cursor"
		/>
	);
}
