import { Skeleton } from "@/shared/components/ui/skeleton";

export default function CreateProductTypeLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du formulaire">
			<span className="sr-only">Chargement du formulaire...</span>

			<h1 className="mb-6 text-2xl font-semibold">Nouveau type de produit</h1>

			<div className="max-w-md space-y-6">
				<Skeleton className="h-4 w-48" />

				<div className="space-y-4">
					{/* Label */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-10 w-full" />
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-24 w-full" />
					</div>
				</div>

				<div className="flex justify-end pt-4">
					<Skeleton className="h-10 w-24" />
				</div>
			</div>
		</div>
	);
}
