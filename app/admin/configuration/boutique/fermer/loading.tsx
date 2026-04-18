import { Skeleton } from "@/shared/components/ui/skeleton";

export default function CloseStoreLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement du formulaire de fermeture"
			className="space-y-6"
		>
			<span className="sr-only">Chargement...</span>

			<Skeleton className="hidden h-5 w-64 md:block" />

			<div className="space-y-3">
				<Skeleton className="h-8 w-56" />
				<Skeleton className="h-5 w-80" />
			</div>

			<div className="mx-auto max-w-2xl space-y-6">
				<Skeleton className="h-4 w-full max-w-md" />

				<div className="space-y-2">
					<Skeleton className="h-5 w-48" />
					<Skeleton className="h-24 w-full rounded-md" />
				</div>

				<div className="space-y-2">
					<Skeleton className="h-5 w-56" />
					<Skeleton className="h-10 w-full rounded-md" />
					<Skeleton className="h-4 w-72" />
				</div>

				<div className="flex flex-col-reverse gap-2 border-t pt-6 md:flex-row md:justify-end">
					<Skeleton className="h-11 w-full md:w-24" />
					<Skeleton className="h-11 w-full md:w-44" />
				</div>
			</div>
		</div>
	);
}
