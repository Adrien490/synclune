import { Skeleton } from "@/shared/components/ui/skeleton";

export default function CreateProductTypeLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du formulaire" className="space-y-6">
			<span className="sr-only">Chargement du formulaire…</span>

			<div className="hidden md:block">
				<Skeleton className="h-8 w-56" />
			</div>

			<div className="max-w-md space-y-6">
				{/* RequiredFieldsNote */}
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

				{/* Sticky footer — mirror AdminFormFooter */}
				<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-[var(--admin-main-x,1.5rem)] px-[var(--admin-main-x,1.5rem)] py-3 backdrop-blur-md md:static md:m-0 md:bg-transparent md:p-0 md:pb-0 md:backdrop-blur-none">
					<div className="flex justify-end">
						<Skeleton className="h-11 w-full sm:w-auto sm:min-w-56" />
					</div>
				</div>
			</div>
		</div>
	);
}
