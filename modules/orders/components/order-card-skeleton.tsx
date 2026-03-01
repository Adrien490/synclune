import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton pour OrderCard (liste commandes client)
 */
export function OrderCardSkeleton() {
	return (
		<div className="bg-card-soft border-border-soft rounded-lg border p-6 shadow-sm">
			{/* Header de la commande */}
			<div className="border-border-soft mb-4 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					<Skeleton className="h-12 w-12 rounded-lg" />
					<div className="space-y-2">
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-4 w-24" />
					</div>
				</div>
				<Skeleton className="h-6 w-20 self-start rounded-full sm:self-auto" />
			</div>

			{/* Details de la commande */}
			<div className="mb-4 grid grid-cols-2 gap-4">
				<div className="space-y-1">
					<Skeleton className="h-3 w-16" />
					<Skeleton className="h-5 w-20" />
				</div>
				<div className="space-y-1">
					<Skeleton className="h-3 w-12" />
					<Skeleton className="h-5 w-16" />
				</div>
			</div>

			{/* Actions */}
			<div className="flex flex-col gap-3 sm:flex-row">
				<Skeleton className="h-10 flex-1" />
			</div>
		</div>
	);
}
