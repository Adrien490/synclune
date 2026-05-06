import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for close-store page.
 * Aligned with page.tsx: Breadcrumb (4 items) + PageHeader + form sections + footer.
 */
export default function CloseStoreLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement du formulaire de fermeture"
			className="space-y-6"
		>
			<span className="sr-only">Chargement...</span>

			{/* Breadcrumb (4 items, desktop) */}
			<div className="hidden md:flex md:items-center md:gap-2">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="flex items-center gap-2">
						<Skeleton className="bg-muted/40 h-4 w-24 motion-safe:animate-pulse" />
						{i < 3 && <span className="text-muted-foreground">/</span>}
					</div>
				))}
			</div>

			<PageHeader
				variant="compact"
				title="Fermer la boutique"
				description="Suspendez temporairement les commandes et affichez un message à vos clients"
				className="hidden md:block"
			/>

			<div className="mx-auto max-w-2xl space-y-6">
				<Skeleton className="h-4 w-full max-w-md motion-safe:animate-pulse" />

				<div className="space-y-2">
					<Skeleton className="h-5 w-48 motion-safe:animate-pulse" />
					<Skeleton className="h-24 w-full rounded-md motion-safe:animate-pulse" />
				</div>

				<div className="space-y-2">
					<Skeleton className="h-5 w-56 motion-safe:animate-pulse" />
					<Skeleton className="h-10 w-full rounded-md motion-safe:animate-pulse" />
					<Skeleton className="h-4 w-72 motion-safe:animate-pulse" />
				</div>

				<div className="flex flex-col-reverse gap-2 border-t pt-6 md:flex-row md:justify-end">
					<Skeleton className="h-11 w-full motion-safe:animate-pulse md:w-24" />
					<Skeleton className="h-11 w-full motion-safe:animate-pulse md:w-44" />
				</div>
			</div>
		</div>
	);
}
