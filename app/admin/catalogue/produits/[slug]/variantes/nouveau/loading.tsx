import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading skeleton pour la page de création de variante
 * Structure: Custom Header + Champs en flux continu + Footer
 */
export default function CreateVariantLoading() {
	return (
		<div className="space-y-6">
			{/* Custom Header */}
			<div className="space-y-2">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-5 w-96" />
			</div>

			{/* La variante */}
			<div className="space-y-6">
				{/* Color */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-20" />
					<div className="flex gap-2">
						<Skeleton className="h-10 flex-1" />
						<Skeleton className="h-10 w-10 rounded-full" />
					</div>
				</div>

				{/* Material */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-10 w-full" />
				</div>

				{/* Size */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-10 w-full" />
				</div>

				{/* Prix et disponibilité */}
				<div className="space-y-4 border-t pt-6">
					{/* Sale Price */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-3 w-40" />
					</div>

					{/* Compare-at Price */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-36" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-3 w-48" />
					</div>

					{/* Inventory */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-3 w-44" />
					</div>
				</div>
			</div>

			{/* Visuels */}
			<div className="space-y-6">
				{/* Image principale */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<div className="border-2 border-dashed rounded-lg p-8 text-center">
						<Skeleton className="h-48 w-full rounded-md" />
						<div className="mt-4 space-y-2">
							<Skeleton className="h-4 w-48 mx-auto" />
							<Skeleton className="h-3 w-32 mx-auto" />
						</div>
					</div>
				</div>

				{/* Galerie */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<Skeleton className="h-6 w-32" />
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
				<div className="flex justify-end">
					<Skeleton className="h-10 w-32" />
				</div>
			</div>
		</div>
	);
}
