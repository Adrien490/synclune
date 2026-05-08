import { PageHeaderSkeleton } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading skeleton pour la page d'édition de variante
 * Structure: PageHeader + Champs en flux continu + Footer
 */
export default function EditVariantLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement de l'édition de variante">
			<span className="sr-only">Chargement...</span>

			{/* Breadcrumb (6 items, desktop only) */}
			<div className="mb-4 hidden md:flex md:items-center md:gap-2">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i} className="flex items-center gap-2">
						<Skeleton className="bg-muted/40 h-4 w-20" />
						{i < 5 && <span className="text-muted-foreground">/</span>}
					</div>
				))}
			</div>

			{/* Page Header Skeleton */}
			<PageHeaderSkeleton variant="compact" className="hidden md:block" />

			<div className="space-y-6">
				{/* La variante */}
				<div className="space-y-6">
					{/* Color */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-10 w-full" />
					</div>

					{/* Material + Size */}
					<div className="space-y-4">
						<div className="space-y-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-10 w-full" />
						</div>
					</div>
				</div>

				{/* Prix */}
				<div className="space-y-4 border-t pt-6">
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-10 w-full" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-36" />
						<Skeleton className="h-10 w-full" />
					</div>
				</div>

				{/* Disponibilité */}
				<div className="space-y-4">
					{/* Stock */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-10 w-full" />
					</div>

					{/* Statut */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-16" />
						<div className="flex gap-4">
							<Skeleton className="h-6 w-20" />
							<Skeleton className="h-6 w-20" />
						</div>
					</div>

					{/* Par défaut */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-3 w-64" />
					</div>
				</div>

				{/* Visuels */}
				<div className="space-y-6">
					{/* Image principale */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-48 w-full rounded-md" />
					</div>

					{/* Galerie */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-6 w-16" />
						</div>
						<div className="rounded-lg border-2 border-dashed p-8 text-center">
							<Skeleton className="h-32 w-full rounded-md" />
							<div className="mt-4 space-y-2">
								<Skeleton className="mx-auto h-4 w-56" />
								<Skeleton className="mx-auto h-3 w-32" />
							</div>
						</div>
					</div>
				</div>

				{/* Sticky footer (mirrors EditProductVariantForm submit bar) */}
				<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-4 border-t px-4 py-3 backdrop-blur-md md:bottom-0 md:-mx-6 md:px-6">
					<div className="flex justify-end">
						<Skeleton className="h-11 w-full sm:w-56" />
					</div>
				</div>
			</div>
		</div>
	);
}
