import { Skeleton } from "@/shared/components/ui/skeleton";

export default function CreateColorLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du formulaire">
			<span className="sr-only">Chargement du formulaire…</span>

			<h1 className="mb-6 text-2xl font-semibold">Nouvelle couleur</h1>

			<div className="max-w-2xl space-y-6">
				<Skeleton className="h-4 w-48" />

				<div className="space-y-6">
					{/* Couleur (palette + hex input) */}
					<div className="space-y-4">
						<Skeleton className="h-4 w-20" />
						{/* Palette grid */}
						<div className="grid grid-cols-8 gap-2 sm:grid-cols-12">
							{Array.from({ length: 24 }).map((_, i) => (
								<Skeleton key={i} className="aspect-square w-full rounded-md" />
							))}
						</div>
						{/* Hex input */}
						<div className="flex items-center gap-2">
							<Skeleton className="size-10 rounded-md" />
							<Skeleton className="h-10 flex-1" />
						</div>
					</div>

					{/* Nom */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-10 w-full" />
					</div>
				</div>

				<div className="flex justify-end pt-4">
					<Skeleton className="h-10 w-24" />
				</div>
			</div>
		</div>
	);
}
