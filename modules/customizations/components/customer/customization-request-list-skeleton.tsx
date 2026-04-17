import { Skeleton } from "@/shared/components/ui/skeleton";

export function CustomizationRequestListSkeleton() {
	return (
		<div
			className="grid grid-cols-1 gap-4 md:grid-cols-2"
			role="status"
			aria-label="Chargement des demandes de personnalisation"
		>
			{Array.from({ length: 4 }).map((_, i) => (
				<div key={i} className="space-y-3 rounded-lg border p-4">
					<div className="flex items-start justify-between gap-3">
						<div className="space-y-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-3 w-24" />
						</div>
						<Skeleton className="h-6 w-20 rounded-full" />
					</div>
					<Skeleton className="h-12 w-full" />
				</div>
			))}
		</div>
	);
}
