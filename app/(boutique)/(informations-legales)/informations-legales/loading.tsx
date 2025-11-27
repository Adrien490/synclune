import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for legal page
 * Covers: Header, legal content sections
 */
export default function LegalLoading() {
	return (
		<div
			className="min-h-screen"
			role="status"
			aria-busy="true"
			aria-label="Chargement des mentions légales"
		>
			<span className="sr-only">Chargement des mentions légales...</span>

			{/* Page Header Skeleton - Uses PageHeader component */}
			<div className="pt-16 sm:pt-20">
				<section className="bg-background border-b border-border">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
						<div className="space-y-2">
							{/* Breadcrumbs */}
							<nav className="text-sm">
								<div className="flex items-center gap-2">
									<Skeleton className="h-4 w-16 bg-muted/40" />
									<span className="text-muted-foreground">/</span>
									<Skeleton className="h-4 w-40 bg-muted/40" />
								</div>
							</nav>

							{/* Title */}
							<Skeleton className="h-8 sm:h-9 w-64 bg-muted/50" />

							{/* Description */}
							<Skeleton className="h-5 w-full max-w-xl bg-muted/30" />
						</div>
					</div>
				</section>
			</div>

			{/* Main Content */}
			<div className="from-ivory via-rose-50/30 to-gold-50/20">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl py-12 lg:py-16">
					{/* Main content card */}
					<div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg space-y-8">
						{/* Legal sections */}
						{Array.from({ length: 6 }).map((_, i) => (
							<section key={i} className="space-y-4">
								{/* Section title */}
								<Skeleton className="h-6 w-72 bg-muted/50" />

								{/* Section content */}
								<div className="space-y-3">
									<Skeleton className="h-4 w-full bg-muted/30" />
									<Skeleton className="h-4 w-full bg-muted/30" />
									<Skeleton className="h-4 w-5/6 bg-muted/30" />
									<Skeleton className="h-4 w-full bg-muted/30" />
									<Skeleton className="h-4 w-4/5 bg-muted/30" />
								</div>
							</section>
						))}

						{/* Contact section */}
						<div className="from-rose-50/50 to-gold-50/50 rounded-xl p-6 space-y-4">
							<Skeleton className="h-6 w-56 bg-muted/50" />
							<Skeleton className="h-4 w-full bg-muted/30" />
							<Skeleton className="h-4 w-5/6 bg-muted/30" />
							<div className="flex flex-col sm:flex-row gap-4 pt-2">
								<Skeleton className="h-12 w-full sm:w-40 bg-primary/20" />
								<Skeleton className="h-12 w-full sm:w-48 bg-muted/30" />
							</div>
						</div>
					</div>

					{/* Last update */}
					<div className="mt-8 text-center">
						<Skeleton className="h-4 w-56 mx-auto bg-muted/30" />
					</div>
				</div>
			</div>
		</div>
	);
}
