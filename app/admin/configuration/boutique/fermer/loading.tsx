import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function CloseStoreLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement du formulaire de fermeture"
			className="space-y-6"
		>
			<span className="sr-only">Chargement…</span>

			{/* Back link mobile (matches AdminDetailBackLink) */}
			<div className="md:hidden">
				<Skeleton className="bg-muted/40 h-5 w-48" />
			</div>

			{/* Breadcrumb (4 items, desktop) */}
			<div className="hidden md:flex md:items-center md:gap-2">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="flex items-center gap-2">
						<Skeleton className="bg-muted/40 h-4 w-24" />
						{i < 3 && <span className="text-muted-foreground">/</span>}
					</div>
				))}
			</div>

			<PageHeader
				variant="compact"
				title="Fermer la boutique"
				description="Cette action interrompt immédiatement les commandes."
			/>

			<div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
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

				{/* Sticky footer mirror (1 button, mobile sticky aligned with AdminFormFooter) */}
				<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-[var(--admin-main-x,1.5rem)] mt-2 border-t px-[var(--admin-main-x,1.5rem)] py-3 backdrop-blur-md md:static md:m-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
					<div className="flex md:justify-end">
						<Skeleton className="h-11 w-full md:w-44" />
					</div>
				</div>
			</div>
		</div>
	);
}
