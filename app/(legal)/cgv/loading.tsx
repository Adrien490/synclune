import { PageHeaderSkeleton } from "@/shared/components/page-header-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Loading state for Terms & Conditions page
 * Structure : PageHeader + Prose (sections avec titres, paragraphes, listes)
 */
export default function CGVLoading() {
	return (
		<div
			className="min-h-dvh"
			role="status"
			aria-busy="true"
			aria-label="Chargement des conditions générales de vente"
		>
			<span className="sr-only">Chargement des conditions générales de vente…</span>

			<PageHeaderSkeleton hasBreadcrumbs />

			{/* Content skeleton */}
			<section className={`bg-background ${SECTION_SPACING.default}`}>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<div className="prose prose-slate max-w-prose space-y-6">
						{/* Date de mise à jour */}
						<Skeleton className="bg-muted/30 h-4 w-64" />

						{/* Sections multiples */}
						{Array.from({ length: 12 }).map((_, i) => (
							<div key={i} className="space-y-4 pt-4">
								{/* Titre section h2 */}
								<Skeleton className="bg-muted/50 h-8 w-80" />

								{/* Sous-titre h3 optionnel */}
								{i % 3 === 0 && <Skeleton className="bg-muted/40 mt-2 h-6 w-64" />}

								{/* Paragraphes */}
								<div className="space-y-2">
									<Skeleton className="bg-muted/30 h-5 w-full" />
									<Skeleton className="bg-muted/30 h-5 w-full" />
									<Skeleton className="bg-muted/30 size-5/6" />
								</div>

								{/* Liste optionnelle */}
								{i % 2 === 0 && (
									<div className="ml-4 space-y-2">
										{Array.from({ length: 4 }).map((_, j) => (
											<div key={j} className="flex gap-2">
												<Skeleton className="bg-muted/40 mt-2 size-2 shrink-0 rounded-full" />
												<Skeleton className="bg-muted/30 h-5 w-full" />
											</div>
										))}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</section>
		</div>
	);
}
