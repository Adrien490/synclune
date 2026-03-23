import { SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Skeleton for the newsletter section.
 * Matches the exact layout to prevent CLS.
 */
export function NewsletterSectionSkeleton() {
	return (
		<div className={`bg-muted/20 relative overflow-hidden ${SECTION_SPACING.section}`}>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<header className="mb-8 text-center lg:mb-12">
					<div className="bg-muted mx-auto h-10 w-48 rounded motion-safe:animate-pulse" />
					<div className="bg-muted/50 mx-auto mt-4 h-7 w-full max-w-md rounded motion-safe:animate-pulse" />
				</header>
				<div className="mx-auto max-w-md">
					<div className="bg-muted h-12 w-full rounded-md motion-safe:animate-pulse" />
					<div className="bg-muted mt-3 h-10 w-full rounded-md motion-safe:animate-pulse" />
				</div>
				<div className="mt-6 text-center">
					<div className="bg-muted/50 mx-auto h-4 w-64 rounded motion-safe:animate-pulse" />
				</div>
			</div>
		</div>
	);
}
