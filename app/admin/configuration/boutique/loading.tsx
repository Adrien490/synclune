import { Skeleton } from "@/shared/components/ui/skeleton";

export default function StoreSettingsLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des paramètres boutique">
			<span className="sr-only">Chargement...</span>
			<div className="mx-auto max-w-2xl space-y-6">
				{/* Status badge */}
				<div className="flex items-center gap-3">
					<Skeleton className="h-5 w-24" />
					<Skeleton className="h-6 w-20 rounded-full" />
				</div>

				{/* Switch toggle */}
				<div className="flex items-center gap-3">
					<Skeleton className="h-6 w-11 rounded-full" />
					<Skeleton className="h-5 w-32" />
				</div>

				{/* Submit button */}
				<Skeleton className="h-10 w-44" />
			</div>
		</div>
	);
}
