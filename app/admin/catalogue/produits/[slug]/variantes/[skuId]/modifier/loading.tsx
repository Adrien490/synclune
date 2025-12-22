import { PageHeaderSkeleton } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading skeleton pour la page d'édition de variante
 * Structure: PageHeader + Champs en flux continu + Footer
 */
export default function EditVariantLoading() {
	return (
		<>
			{/* Page Header Skeleton */}
			<PageHeaderSkeleton variant="compact" />

			<div className="space-y-6">
				{/* La variante */}
				<div className="space-y-6">
					{/* Color */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-10 w-full" />
					</div>

					{/* Material + Size */}
					<div className="space-y-4">
						<div className="space-y-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-10 w-full" />
						</div>
					</div>
				</div>

				{/* Prix */}
				<div className="space-y-4 border-t pt-6">
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-10 w-full" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-36" />
						<Skeleton className="h-10 w-full" />
					</div>
				</div>

				{/* Disponibilité */}
				<div className="space-y-4">
					{/* Stock */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-10 w-full" />
					</div>

					{/* Statut */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-16" />
						<div className="flex gap-4">
							<Skeleton className="h-6 w-20" />
							<Skeleton className="h-6 w-20" />
						</div>
					</div>

					{/* Par défaut */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-3 w-64" />
					</div>
				</div>

				{/* Visuels */}
				<div className="space-y-6">
					{/* Image principale */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-48 w-full rounded-md" />
					</div>

					{/* Galerie */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-6 w-16" />
						</div>
						<div className="border-2 border-dashed rounded-lg p-8 text-center">
							<Skeleton className="h-32 w-full rounded-md" />
							<div className="mt-4 space-y-2">
								<Skeleton className="h-4 w-56 mx-auto" />
								<Skeleton className="h-3 w-32 mx-auto" />
							</div>
						</div>
					</div>
				</div>

				{/* Form Footer */}
				<div className="mt-6">
					<div className="flex justify-between items-center gap-4">
						<Skeleton className="h-10 w-24" />
						<Skeleton className="h-10 w-40" />
					</div>
				</div>
			</div>
		</>
	);
}
