import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Skeleton de chargement pour la section CreativeProcess
 * Reproduit exactement la structure pour éviter le CLS
 */
export function CreativeProcessSkeleton() {
	return (
		<section
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.section}`}
			aria-label="Chargement du processus créatif"
		>
			<div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Header skeleton */}
				<header className="text-center mb-12 lg:mb-16">
					<Skeleton className="h-10 w-80 mx-auto bg-muted/50" />
					<Skeleton className="mt-4 h-6 w-full max-w-2xl mx-auto bg-muted/30" />
				</header>

				<div className="grid lg:grid-cols-2 gap-12 items-center">
					{/* Image atelier - order-1 (en premier sur mobile et desktop) */}
					<div className="relative order-1 h-56 sm:h-80 lg:h-full">
						<div className="relative h-full w-full overflow-hidden rounded-2xl bg-muted shadow-xl">
							<Skeleton className="absolute inset-0 bg-muted/40" />
							{/* Badge "Fait main à Nantes" */}
							<div className="absolute top-4 right-4 z-10">
								<Skeleton className="h-8 w-40 bg-secondary/30 rounded-full" />
							</div>
						</div>
					</div>

					{/* Timeline processus - order-2 */}
					<div className="relative order-2 space-y-8 sm:space-y-12 lg:space-y-16">
						{/* 4 étapes du processus */}
						{Array.from({ length: 4 }).map((_, i) => (
							<article key={i} className="flex items-start gap-4">
								{/* Icône/numéro */}
								<Skeleton className="shrink-0 w-11 sm:w-12 h-11 sm:h-12 rounded-full bg-muted/40" />
								<div className="flex-1 space-y-2 pb-8">
									{/* Titre étape */}
									<Skeleton className="h-6 w-40 bg-muted/50" />
									{/* Description */}
									<Skeleton className="h-5 w-full bg-muted/30" />
									<Skeleton className="h-5 w-5/6 bg-muted/30" />
								</div>
							</article>
						))}

						{/* CTA Section */}
						<div className="flex items-start gap-4">
							{/* Icône bonus */}
							<Skeleton className="shrink-0 w-11 sm:w-12 h-11 sm:h-12 rounded-full bg-muted/30 border-2 border-dashed border-muted" />
							<div className="flex-1 space-y-3">
								<Skeleton className="h-4 w-full bg-muted/20" />
								<Skeleton className="h-12 w-full sm:w-56 bg-muted/40 rounded-lg shadow-sm" />
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
