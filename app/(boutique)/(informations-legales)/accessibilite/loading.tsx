import { PageHeaderSkeleton } from "@/shared/components/page-header-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Loading state for accessibility page
 * Covers: Header, accessibility cards and sections
 */
export default function AccessibilityLoading() {
	return (
		<div
			className="min-h-screen"
			role="status"
			aria-busy="true"
			aria-label="Chargement de la page d'accessibilité"
		>
			<span className="sr-only">Chargement de la page d'accessibilité...</span>

			<PageHeaderSkeleton />

			{/* Main Content */}
			<div className="bg-background">
				<div
					className={`container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 ${SECTION_SPACING.default}`}
				>
					{/* Conformity status card */}
					<div className="bg-card mb-8 space-y-4 rounded-lg border p-6 shadow-lg">
						<Skeleton className="bg-muted/50 h-6 w-48" />
						<Skeleton className="bg-muted/30 h-4 w-full" />
						<Skeleton className="bg-muted/30 h-4 w-full" />
						<Skeleton className="bg-muted/30 h-4 w-3/4" />
						<div className="bg-primary/5 rounded-lg p-4">
							<Skeleton className="bg-muted/30 h-3 w-56" />
						</div>
					</div>

					{/* Features card */}
					<div className="bg-card mb-8 space-y-4 rounded-lg border p-6 shadow-lg">
						<Skeleton className="bg-muted/50 mb-6 h-6 w-80" />
						<div className="space-y-4">
							{Array.from({ length: 10 }).map((_, i) => (
								<div key={i} className="flex gap-3">
									<Skeleton className="bg-muted/40 h-5 w-5 shrink-0 rounded-sm" />
									<div className="flex-1 space-y-2">
										<Skeleton className="bg-muted/40 h-4 w-48" />
										<Skeleton className="bg-muted/30 h-3 w-full" />
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Keyboard shortcuts card */}
					<div className="bg-card mb-8 space-y-4 rounded-lg border p-6 shadow-lg">
						<Skeleton className="bg-muted/50 h-6 w-56" />
						<div className="space-y-3">
							{Array.from({ length: 5 }).map((_, i) => (
								<div
									key={i}
									className="border-border flex items-center justify-between border-b py-2"
								>
									<Skeleton className="bg-muted/30 h-4 w-40" />
									<Skeleton className="bg-muted/40 h-8 w-24 rounded-md" />
								</div>
							))}
						</div>
					</div>

					{/* Compatible technologies card */}
					<div className="bg-card mb-8 space-y-4 rounded-lg border p-6 shadow-lg">
						<Skeleton className="bg-muted/50 h-6 w-72" />
						<Skeleton className="bg-muted/30 h-4 w-full" />
						<div className="mt-4 space-y-3">
							{Array.from({ length: 6 }).map((_, i) => (
								<div key={i} className="flex gap-2">
									<Skeleton className="bg-muted/40 h-5 w-5 shrink-0 rounded-sm" />
									<Skeleton className="bg-muted/30 h-4 w-56" />
								</div>
							))}
						</div>
					</div>

					{/* Known limitations card */}
					<div className="bg-card mb-8 space-y-4 rounded-lg border p-6 shadow-lg">
						<Skeleton className="bg-muted/50 h-6 w-80" />
						<Skeleton className="bg-muted/30 h-4 w-full" />
						<div className="mt-4 space-y-2">
							<Skeleton className="bg-muted/30 h-3 w-full" />
							<Skeleton className="bg-muted/30 h-3 w-full" />
							<Skeleton className="bg-muted/30 h-3 w-5/6" />
						</div>
					</div>

					{/* Contact card */}
					<div className="bg-muted/20 space-y-4 rounded-lg border p-6 shadow-lg">
						<Skeleton className="bg-muted/50 h-6 w-64" />
						<Skeleton className="bg-muted/30 h-4 w-full" />
						<Skeleton className="bg-muted/30 h-4 w-5/6" />
						<div className="mt-4 space-y-2">
							<Skeleton className="bg-muted/40 h-4 w-32" />
							<Skeleton className="bg-muted/30 h-3 w-64" />
							<Skeleton className="bg-muted/30 h-3 w-48" />
						</div>
						<Skeleton className="bg-muted/30 mt-4 h-3 w-full" />
					</div>

					{/* References section */}
					<div className="bg-muted/10 mt-8 space-y-3 rounded-lg border p-6">
						<Skeleton className="bg-muted/50 h-6 w-48" />
						<Skeleton className="bg-muted/30 h-3 w-full" />
						<Skeleton className="bg-muted/30 h-3 w-full" />
						<Skeleton className="bg-muted/30 h-3 w-5/6" />
					</div>
				</div>
			</div>
		</div>
	);
}
