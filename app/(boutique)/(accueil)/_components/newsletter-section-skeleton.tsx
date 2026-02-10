import { SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Skeleton for the newsletter section.
 * Matches the exact layout to prevent CLS.
 */
export function NewsletterSectionSkeleton() {
	return (
		<div className={`relative overflow-hidden bg-muted/20 ${SECTION_SPACING.section}`}>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<header className="mb-8 text-center lg:mb-12">
					<div className="h-10 w-48 mx-auto bg-muted animate-pulse rounded" />
					<div className="mt-4 h-7 w-full max-w-md mx-auto bg-muted/50 animate-pulse rounded" />
				</header>
				<div className="max-w-md mx-auto">
					<div className="h-12 w-full bg-muted animate-pulse rounded-md" />
					<div className="mt-3 h-10 w-full bg-muted animate-pulse rounded-md" />
				</div>
				<div className="mt-6 text-center">
					<div className="h-4 w-64 mx-auto bg-muted/50 animate-pulse rounded" />
				</div>
			</div>
		</div>
	);
}
