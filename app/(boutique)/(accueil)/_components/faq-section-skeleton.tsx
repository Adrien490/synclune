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
				<header className="mb-10 text-center lg:mb-12">
					<Skeleton className="bg-muted/50 mx-auto h-10 w-64" />
					<Skeleton className="bg-muted/30 mx-auto mt-4 h-6 w-full max-w-xl" />
				</header>

				{/* Accordion items skeleton - 6 questions */}
				<div className="mx-auto max-w-3xl space-y-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="bg-muted/30 rounded-xl border px-5 py-5 shadow-sm">
							<Skeleton className="bg-muted/50 h-5 w-full max-w-md" />
						</div>
					))}
				</div>

				{/* CTA contact card */}
				<div className="bg-primary/5 border-primary/15 mx-auto mt-12 max-w-3xl space-y-3 rounded-2xl border p-6 text-center sm:p-8">
					<Skeleton className="bg-muted/30 mx-auto h-5 w-56" />
					<Skeleton className="bg-muted/20 mx-auto h-4 w-44" />
					<Skeleton className="bg-muted/30 mx-auto mt-2 h-11 w-40 rounded-md" />
				</div>
			</div>
		</section>
	);
}
