import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Skeleton de chargement pour la section FAQ
 * Reproduit exactement la structure pour eviter le CLS
 */
export function FaqSectionSkeleton() {
	return (
		<section
			className={`bg-muted/20 ${SECTION_SPACING.section}`}
			aria-label="Chargement des questions frequentes"
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Header */}
				<header className="text-center mb-10 lg:mb-12">
					<Skeleton className="h-10 w-64 mx-auto bg-muted/50" />
					<Skeleton className="mt-4 h-6 w-full max-w-xl mx-auto bg-muted/30" />
				</header>

				{/* Accordion items skeleton - 6 questions */}
				<div className="max-w-3xl mx-auto space-y-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<div
							key={i}
							className="bg-muted/30 rounded-xl px-5 py-5 border shadow-sm"
						>
							<Skeleton className="h-5 w-full max-w-md bg-muted/50" />
						</div>
					))}
				</div>

				{/* CTA contact card */}
				<div className="mt-12 max-w-3xl mx-auto bg-primary/5 border border-primary/15 rounded-2xl p-6 sm:p-8 text-center space-y-3">
					<Skeleton className="h-5 w-56 mx-auto bg-muted/30" />
					<Skeleton className="h-4 w-44 mx-auto bg-muted/20" />
					<Skeleton className="h-11 w-40 mx-auto rounded-md bg-muted/30 mt-2" />
				</div>
			</div>
		</section>
	);
}
