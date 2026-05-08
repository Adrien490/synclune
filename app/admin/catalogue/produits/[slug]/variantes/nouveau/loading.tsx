import { PageHeaderSkeleton } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading skeleton pour la page de création de variante.
 * Aligned with page.tsx: Breadcrumb (6 items) + PageHeader + form sections + footer.
 */
export default function CreateVariantLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement de la création de variante"
			className="space-y-6"
		>
			<span className="sr-only">Chargement…</span>

			{/* Breadcrumb (6 items, desktop only) */}
			<div className="hidden md:flex md:items-center md:gap-2">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i} className="flex items-center gap-2">
						<Skeleton className="bg-muted/40 h-4 w-20" />
						{i < 5 && <span className="text-muted-foreground">/</span>}
					</div>
				))}
			</div>

			<PageHeaderSkeleton variant="compact" hasDescription className="hidden md:block" />

			{/* Mobile title (no PageHeader on mobile in real page) */}
			<div className="space-y-2 md:hidden">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-5 w-96 max-w-full" />
			</div>

			{/* La variante */}
			<div className="space-y-6">
				{/* Color */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-20" />
					<div className="flex gap-2">
						<Skeleton className="h-10 flex-1" />
						<Skeleton className="size-10 rounded-full" />
					</div>
				</div>

				{/* Material */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-10 w-full" />
				</div>

				{/* Size */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-10 w-full" />
				</div>

				{/* Prix et disponibilité */}
				<div className="space-y-4 border-t pt-6">
					{/* Sale Price */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-3 w-40" />
					</div>

					{/* Compare-at Price */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-36" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-3 w-48" />
					</div>

					{/* Inventory */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-3 w-44" />
					</div>
				</div>
			</div>

			{/* Visuels */}
			<div className="space-y-6">
				{/* Image principale */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<div className="rounded-lg border-2 border-dashed p-8 text-center">
						<Skeleton className="h-48 w-full rounded-md" />
						<div className="mt-4 space-y-2">
							<Skeleton className="mx-auto h-4 w-48" />
							<Skeleton className="mx-auto h-3 w-32" />
						</div>
					</div>
				</div>

				{/* Galerie */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<Skeleton className="h-6 w-32" />
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

			{/* Sticky footer (mirrors CreateProductVariantForm submit bar) */}
			<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-4 border-t px-4 py-3 backdrop-blur-md md:bottom-0 md:-mx-6 md:px-6">
				<div className="flex justify-end">
					<Skeleton className="h-11 w-full sm:w-56" />
				</div>
			</div>
		</div>
	);
}
