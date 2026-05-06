import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for store settings page.
 * Aligned with page.tsx: PageHeader + form (status badge + switch + submit).
 */
export default function StoreSettingsLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des paramètres boutique">
			<span className="sr-only">Chargement...</span>

			<PageHeader
				variant="compact"
				title="Paramètres boutique"
				description="Configurez votre boutique et son fonctionnement"
				className="hidden md:block"
			/>

			<div className="mx-auto max-w-2xl space-y-6">
				{/* Status badge */}
				<div className="flex items-center gap-3">
					<Skeleton className="h-5 w-24 motion-safe:animate-pulse" />
					<Skeleton className="h-6 w-20 rounded-full motion-safe:animate-pulse" />
				</div>

				{/* Switch toggle */}
				<div className="flex items-center gap-3">
					<Skeleton className="h-6 w-11 rounded-full motion-safe:animate-pulse" />
					<Skeleton className="h-5 w-32 motion-safe:animate-pulse" />
				</div>

				{/* Submit button */}
				<Skeleton className="h-10 w-44 motion-safe:animate-pulse" />
			</div>
		</div>
	);
}
