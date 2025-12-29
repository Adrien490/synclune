import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading skeleton pour la page de modification de collection
 */
export default function EditCollectionLoading() {
	return (
		<>
			{/* Title */}
			<Skeleton className="h-8 w-48 mb-6" />

			{/* Form skeleton */}
			<div className="max-w-lg space-y-6">
				{/* Name field */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-12" />
					<Skeleton className="h-10 w-full" />
				</div>

				{/* Slug field */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-12" />
					<Skeleton className="h-10 w-full" />
				</div>

				{/* Description field */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-24 w-full" />
				</div>

				{/* Status field */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-10 w-full" />
				</div>

				{/* Submit button */}
				<Skeleton className="h-10 w-full" />
			</div>
		</>
	);
}
