import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton pour OrderCard (liste commandes client)
 */
export function OrderCardSkeleton() {
	return (
		<div className="bg-card-soft border border-border-soft rounded-lg p-6 shadow-sm">
			{/* Header de la commande */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-4 border-b border-border-soft">
				<div className="flex items-center gap-3">
					<Skeleton className="w-12 h-12 rounded-lg" />
					<div className="space-y-2">
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-4 w-24" />
					</div>
				</div>
				<Skeleton className="h-6 w-20 rounded-full self-start sm:self-auto" />
			</div>

			{/* Details de la commande */}
			<div className="grid grid-cols-2 gap-4 mb-4">
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
			<div className="flex flex-col sm:flex-row gap-3">
				<Skeleton className="h-10 flex-1" />
			</div>
		</div>
	);
}

