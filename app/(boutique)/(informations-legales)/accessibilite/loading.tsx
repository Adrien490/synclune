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

			{/* Page Header Skeleton - Uses PageHeader component */}
			<div className="pt-16">
				<section className="bg-background border-b border-border">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
						<div className="space-y-2">
							{/* Breadcrumbs */}
							<nav className="text-sm">
								<div className="flex items-center gap-2">
									<Skeleton className="h-4 w-16 bg-muted/40" />
									<span className="text-muted-foreground">/</span>
									<Skeleton className="h-4 w-32 bg-muted/40" />
								</div>
							</nav>

							{/* Title */}
							<Skeleton className="h-8 sm:h-9 w-80 bg-muted/50" />

							{/* Description */}
							<Skeleton className="h-5 w-full bg-muted/30" />
							<Skeleton className="h-5 w-5/6 bg-muted/30" />
						</div>
					</div>
				</section>
			</div>

			{/* Main Content */}
			<div className="from-ivory via-rose-50/30 to-gold-50/20">
				<div className={`container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl ${SECTION_SPACING.default}`}>
					{/* Conformity status card */}
					<div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg mb-8 p-6 space-y-4">
						<Skeleton className="h-6 w-48 bg-muted/50" />
						<Skeleton className="h-4 w-full bg-muted/30" />
						<Skeleton className="h-4 w-full bg-muted/30" />
						<Skeleton className="h-4 w-3/4 bg-muted/30" />
						<div className="bg-primary/5 p-4 rounded-lg">
							<Skeleton className="h-3 w-56 bg-muted/30" />
						</div>
					</div>

					{/* Features card */}
					<div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg mb-8 p-6 space-y-4">
						<Skeleton className="h-6 w-80 bg-muted/50 mb-6" />
						<div className="space-y-4">
							{Array.from({ length: 10 }).map((_, i) => (
								<div key={i} className="flex gap-3">
									<Skeleton className="h-5 w-5 rounded-sm bg-muted/40 shrink-0" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-4 w-48 bg-muted/40" />
										<Skeleton className="h-3 w-full bg-muted/30" />
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Keyboard shortcuts card */}
					<div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg mb-8 p-6 space-y-4">
						<Skeleton className="h-6 w-56 bg-muted/50" />
						<div className="space-y-3">
							{Array.from({ length: 5 }).map((_, i) => (
								<div
									key={i}
									className="flex justify-between items-center py-2 border-b border-gray-200"
								>
									<Skeleton className="h-4 w-40 bg-muted/30" />
									<Skeleton className="h-8 w-24 bg-muted/40 rounded-md" />
								</div>
							))}
						</div>
					</div>

					{/* Compatible technologies card */}
					<div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg mb-8 p-6 space-y-4">
						<Skeleton className="h-6 w-72 bg-muted/50" />
						<Skeleton className="h-4 w-full bg-muted/30" />
						<div className="space-y-3 mt-4">
							{Array.from({ length: 6 }).map((_, i) => (
								<div key={i} className="flex gap-2">
									<Skeleton className="h-5 w-5 rounded-sm bg-muted/40 shrink-0" />
									<Skeleton className="h-4 w-56 bg-muted/30" />
								</div>
							))}
						</div>
					</div>

					{/* Known limitations card */}
					<div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg mb-8 p-6 space-y-4">
						<Skeleton className="h-6 w-80 bg-muted/50" />
						<Skeleton className="h-4 w-full bg-muted/30" />
						<div className="space-y-2 mt-4">
							<Skeleton className="h-3 w-full bg-muted/30" />
							<Skeleton className="h-3 w-full bg-muted/30" />
							<Skeleton className="h-3 w-5/6 bg-muted/30" />
						</div>
					</div>

					{/* Contact card */}
					<div className="from-primary/5 to-secondary/5 rounded-lg shadow-lg p-6 space-y-4">
						<Skeleton className="h-6 w-64 bg-muted/50" />
						<Skeleton className="h-4 w-full bg-muted/30" />
						<Skeleton className="h-4 w-5/6 bg-muted/30" />
						<div className="space-y-2 mt-4">
							<Skeleton className="h-4 w-32 bg-muted/40" />
							<Skeleton className="h-3 w-64 bg-muted/30" />
							<Skeleton className="h-3 w-48 bg-muted/30" />
						</div>
						<Skeleton className="h-3 w-full bg-muted/30 mt-4" />
					</div>

					{/* References section */}
					<div className="mt-8 p-6 bg-white/50 rounded-lg space-y-3">
						<Skeleton className="h-6 w-48 bg-muted/50" />
						<Skeleton className="h-3 w-full bg-muted/30" />
						<Skeleton className="h-3 w-full bg-muted/30" />
						<Skeleton className="h-3 w-5/6 bg-muted/30" />
					</div>
				</div>
			</div>
		</div>
	);
}
