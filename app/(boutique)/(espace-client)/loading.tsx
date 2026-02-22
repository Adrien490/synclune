import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for espace client pages
 * Structure alignee avec le dashboard : PageHeader compact + Card
 */
export default function EspaceClientLoading() {
	return (
		<div
			className="space-y-6 animate-pulse"
			role="status"
			aria-busy="true"
			aria-label="Chargement de la page"
		>
			<span className="sr-only">Chargement en cours...</span>

			{/* PageHeader compact skeleton */}
			<div className="space-y-3">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-5 w-64" />
			</div>

			{/* Card skeleton */}
			<div className="rounded-xl border border-border bg-card p-6 space-y-4">
				<Skeleton className="h-6 w-32" />
				<div className="space-y-3">
					<Skeleton className="h-4 w-full max-w-sm" />
					<Skeleton className="h-4 w-full max-w-xs" />
					<Skeleton className="h-4 w-full max-w-[280px]" />
				</div>
			</div>
		</div>
	);
}
