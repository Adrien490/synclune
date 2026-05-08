import { Skeleton } from "@/shared/components/ui/skeleton";

export default function EditColorLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du formulaire" className="space-y-4">
			<span className="sr-only">Chargement du formulaire…</span>

			{/* Mobile back link (mirror AdminDetailBackLink) */}
			<div className="md:hidden">
				<Skeleton className="h-5 w-40" />
			</div>

			{/* Mirror page.tsx: h1 hidden md:block (color.name) */}
			<div className="hidden md:block">
				<Skeleton className="h-8 w-48" />
			</div>

			<div className="max-w-2xl space-y-6">
				<Skeleton className="h-4 w-48" />

				<div className="space-y-4">
					{/* Couleur (color picker + hex input) */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<div className="flex items-stretch gap-2">
							<Skeleton className="h-10 w-12 rounded-md" />
							<Skeleton className="h-10 flex-1" />
						</div>
					</div>

					{/* Nom */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-10 w-full" />
					</div>
				</div>

				{/* Sticky footer — mirror AdminFormFooter */}
				<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-[var(--admin-main-x,1.5rem)] border-t px-[var(--admin-main-x,1.5rem)] py-3 backdrop-blur-md md:static md:m-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
					<div className="flex justify-end">
						<Skeleton className="h-10 w-32" />
					</div>
				</div>
			</div>
		</div>
	);
}
