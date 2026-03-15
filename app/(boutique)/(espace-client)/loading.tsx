import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Generic loading fallback for espace client route transitions
 */
export default function EspaceClientLoading() {
	return (
		<div
			className="space-y-6 motion-safe:animate-pulse"
			role="status"
			aria-busy="true"
			aria-label="Chargement de la page"
		>
			<span className="sr-only">Chargement en cours...</span>

			{/* Card skeleton */}
			<div className="border-border bg-card space-y-4 rounded-xl border p-6">
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
