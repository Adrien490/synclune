import { Skeleton } from "@/shared/components/ui/skeleton";

export default function CreateCollectionLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du formulaire">
			<span className="sr-only">Chargement du formulaire…</span>

			{/* Mirror page.tsx: h1 hidden md:block */}
			<div className="mb-6 hidden md:block">
				<Skeleton className="h-8 w-56" />
			</div>

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

				{/* Sticky footer — mirror AdminFormFooter */}
				<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-[var(--admin-main-x,1.5rem)] border-t px-[var(--admin-main-x,1.5rem)] py-3 backdrop-blur-md md:static md:m-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
					<div className="flex justify-end">
						<Skeleton className="h-10 w-35" />
					</div>
				</div>
			</div>
		</div>
	);
}
