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
				<div
					className={`container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 ${SECTION_SPACING.default}`}
				>
					{/* Main content card */}
					<div className="bg-card space-y-8 rounded-2xl border p-8 shadow-lg">
						{/* Legal sections */}
						{Array.from({ length: 6 }).map((_, i) => (
							<section key={i} className="space-y-4">
								{/* Section title */}
								<Skeleton className="bg-muted/50 h-6 w-72" />

								{/* Section content */}
								<div className="space-y-3">
									<Skeleton className="bg-muted/30 h-4 w-full" />
									<Skeleton className="bg-muted/30 h-4 w-full" />
									<Skeleton className="bg-muted/30 h-4 w-5/6" />
									<Skeleton className="bg-muted/30 h-4 w-full" />
									<Skeleton className="bg-muted/30 h-4 w-4/5" />
								</div>
							</section>
						))}

						{/* Contact section */}
						<div className="bg-muted/20 space-y-4 rounded-xl p-6">
							<Skeleton className="bg-muted/50 h-6 w-56" />
							<Skeleton className="bg-muted/30 h-4 w-full" />
							<Skeleton className="bg-muted/30 h-4 w-5/6" />
							<div className="flex flex-col gap-4 pt-2 sm:flex-row">
								<Skeleton className="bg-primary/20 h-12 w-full sm:w-40" />
								<Skeleton className="bg-muted/30 h-12 w-full sm:w-48" />
							</div>
						</div>
					</div>

					{/* Last update */}
					<div className="mt-8 text-center">
						<Skeleton className="bg-muted/30 mx-auto h-4 w-56" />
					</div>
				</div>
			</div>
		</div>
	);
}
