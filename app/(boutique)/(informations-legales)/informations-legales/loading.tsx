import { PageHeaderSkeleton } from "@/shared/components/page-header-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";

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

			<PageHeaderSkeleton />

			{/* Main Content */}
			<div className="bg-background">
				<div className={`container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl ${SECTION_SPACING.default}`}>
					{/* Main content card */}
					<div className="bg-card border rounded-2xl p-8 shadow-lg space-y-8">
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
						<div className="bg-muted/20 rounded-xl p-6 space-y-4">
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
