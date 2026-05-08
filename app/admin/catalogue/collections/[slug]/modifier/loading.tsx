import { Skeleton } from "@/shared/components/ui/skeleton";

export default function EditCollectionLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du formulaire">
			<span className="sr-only">Chargement du formulaire...</span>

			{/* Title (matches dynamic collection.name in page.tsx) */}
			<Skeleton className="mb-6 h-8 w-48" />

			{/* Form skeleton — aligned with EditCollectionForm: name, description, status, submit */}
			<div className="max-w-lg space-y-4">
				<div className="space-y-2">
					<Skeleton className="h-4 w-12" />
					<Skeleton className="h-10 w-full" />
				</div>

				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-24 w-full" />
				</div>

				<div className="space-y-2">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-10 w-full" />
				</div>

				<div className="flex justify-end pt-4">
					<Skeleton className="h-10 w-36" />
				</div>
			</div>
		</div>
	);
}
