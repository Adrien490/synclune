import { PageHeaderSkeleton } from "@/shared/components/page-header-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Loading state for Withdrawal/Retractation page
 * Structure : PageHeader + Prose (sections avec titres, paragraphes, listes)
 */
export default function RetractationLoading() {
	return (
		<div
			className="min-h-dvh"
			role="status"
			aria-busy="true"
			aria-label="Chargement du droit de rétractation"
		>
			<span className="sr-only">Chargement du droit de rétractation…</span>

			<PageHeaderSkeleton hasBreadcrumbs />

			{/* Content skeleton */}
			<section className={`bg-background ${SECTION_SPACING.default}`}>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<div className="prose prose-slate max-w-prose space-y-6">
						{/* Date de mise à jour */}
						<Skeleton className="bg-muted/30 h-4 w-64" />

						{/* Sections multiples */}
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="space-y-4 pt-4">
								{/* Titre section h2 */}
								<Skeleton className="bg-muted/50 h-8 w-96" />

								{/* Paragraphes */}
								<div className="space-y-2">
									<Skeleton className="bg-muted/30 h-5 w-full" />
									<Skeleton className="bg-muted/30 h-5 w-full" />
									<Skeleton className="bg-muted/30 size-5/6" />
								</div>

								{/* Formulaire skeleton (section 2-3) — réserve la hauteur du formulaire réel (~14 champs) pour éviter le CLS */}
								{i === 2 && (
									<div className="bg-muted/20 min-h-[600px] space-y-4 rounded-lg border p-6">
										<Skeleton className="bg-muted/50 h-6 w-64" />
										<div className="space-y-3">
											{Array.from({ length: 12 }).map((_, j) => (
												<div key={j} className="space-y-2">
													<Skeleton className="bg-muted/40 h-4 w-32" />
													<Skeleton className="bg-muted/30 h-10 w-full rounded-md" />
												</div>
											))}
										</div>
										<Skeleton className="bg-primary/20 h-12 w-full rounded-md" />
									</div>
								)}

								{/* Liste optionnelle */}
								{i % 2 === 0 && (
									<div className="ml-4 space-y-2">
										{Array.from({ length: 3 }).map((_, j) => (
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
