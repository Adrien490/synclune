import { Skeleton } from "@/shared/components/ui/skeleton";

export default function CreateMaterialLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du formulaire">
			<span className="sr-only">Chargement du formulaire...</span>

			<h1 className="mb-6 text-2xl font-semibold">Nouveau matériau</h1>

			<div className="max-w-lg space-y-6">
				<Skeleton className="h-4 w-48" />

				<div className="space-y-4">
					{/* Nom */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-10 w-full" />
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-20 w-full" />
					</div>
				</div>

				<div className="flex justify-end pt-4">
					<Skeleton className="h-10 w-24" />
				</div>
			</div>
		</div>
	);
}
