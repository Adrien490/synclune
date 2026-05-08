import { Skeleton } from "@/shared/components/ui/skeleton";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Skeleton aligné sur HomeFaq : SectionTitle + sous-titre + 6 accordion items + CTA bottom.
 * Réserve la hauteur réelle (~600px desktop) pour éviter le CLS en bas de la home.
 */
export function HomeFaqSkeleton() {
	return (
		<section aria-hidden="true" className={`bg-background relative ${SECTION_SPACING.section}`}>
			<div className={CONTAINER_CLASS}>
				<header className="mb-10 text-center lg:mb-14">
					<Skeleton className="bg-muted/50 mx-auto h-8 w-72 sm:h-10 sm:w-96" />
					<Skeleton className="bg-muted/30 mx-auto mt-5 h-5 w-80 max-w-full" />
				</header>

				<div className="mx-auto max-w-3xl space-y-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="border-border flex items-center justify-between border-b py-5">
							<Skeleton className="bg-muted/40 h-5 w-3/4 max-w-xl" />
							<Skeleton className="bg-muted/30 h-4 w-4 shrink-0 rounded" />
						</div>
					))}
				</div>

				<div className="mt-10 flex justify-center lg:mt-14">
					<Skeleton className="bg-muted/40 h-12 w-72 max-w-full rounded-md" />
				</div>
			</div>
		</section>
	);
}
