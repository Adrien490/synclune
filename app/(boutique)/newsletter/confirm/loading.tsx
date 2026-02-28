import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Loading state for Newsletter Confirmation page
 * Structure identique à unsubscribe page
 */
export default function NewsletterConfirmLoading() {
	return (
		<div className="min-h-screen">
			{/* PageHeader skeleton */}
			<div className="bg-background border-border relative border-b">
				<div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
					<Skeleton className="bg-muted/50 mb-4 h-10 w-96" />
					<Skeleton className="bg-muted/30 h-5 w-80" />
				</div>
			</div>

			{/* Content skeleton */}
			<div className={`from-ivory to-gold-50/20 via-rose-50/30 ${SECTION_SPACING.default}`}>
				<div className="container mx-auto max-w-2xl px-4">
					<div className="bg-card/80 space-y-6 rounded-2xl p-8 shadow-lg backdrop-blur-sm">
						{/* Emoji + titre + description */}
						<div className="space-y-4 text-center">
							<Skeleton className="bg-muted/40 mx-auto h-16 w-16 rounded-full" />
							<Skeleton className="bg-muted/50 mx-auto h-8 w-80" />
							<div className="space-y-2">
								<Skeleton className="bg-muted/30 mx-auto h-5 w-full max-w-md" />
								<Skeleton className="bg-muted/30 mx-auto h-5 w-full max-w-sm" />
							</div>
						</div>

						{/* Reassurance */}
						<div className="bg-primary/5 rounded-lg p-4 text-center">
							<Skeleton className="bg-muted/30 mx-auto h-4 w-80" />
						</div>

						{/* Boutons */}
						<div className="flex flex-col justify-center gap-4 border-t pt-6 sm:flex-row">
							<Skeleton className="bg-muted/30 h-10 w-full rounded-md sm:w-48" />
							<Skeleton className="bg-muted/30 h-10 w-full rounded-md sm:w-56" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
