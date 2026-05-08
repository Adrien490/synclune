import { Skeleton } from "@/shared/components/ui/skeleton";

export default function CreateCollectionLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du formulaire">
			<span className="sr-only">Chargement du formulaire…</span>

			<h1 className="mb-6 text-2xl font-semibold">Nouvelle collection</h1>

			<div className="max-w-lg space-y-4">
				{/* Nom */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-12" />
					<Skeleton className="h-10 w-full" />
				</div>

				{/* Description */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-24 w-full" />
				</div>

				{/* Statut */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-10 w-full" />
				</div>

				<div className="flex justify-end pt-4">
					<Skeleton className="h-10 w-35" />
				</div>
			</div>
		</div>
	);
}
