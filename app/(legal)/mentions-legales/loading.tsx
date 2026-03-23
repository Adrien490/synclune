import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Loading state for Legal Notices page
 * Structure : PageHeader + Prose (sections avec titres, paragraphes, listes)
 */
export default function MentionsLegalesLoading() {
	return (
		<>
			{/* PageHeader skeleton */}
			<div className="bg-background border-border relative border-b">
				<div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
					{/* Breadcrumbs skeleton */}
					<div className="mb-6 flex items-center gap-2">
						<Skeleton className="bg-muted/40 h-4 w-16" />
						<span className="text-muted-foreground">/</span>
						<Skeleton className="bg-muted/40 h-4 w-32" />
					</div>

					{/* Title skeleton */}
					<Skeleton className="bg-muted/50 mb-4 h-10 w-80" />

					{/* Description skeleton */}
					<Skeleton className="bg-muted/30 h-5 w-full max-w-2xl" />
				</div>
			</div>

			{/* Content skeleton */}
			<section className={`bg-background ${SECTION_SPACING.default}`}>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<div className="prose prose-slate max-w-prose space-y-6">
						{/* Date de mise à jour */}
						<Skeleton className="bg-muted/30 h-4 w-64" />

						{/* Sections multiples */}
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="space-y-4 pt-4">
								{/* Titre section h2 */}
								<Skeleton className="bg-muted/50 h-8 w-72" />

								{/* Paragraphes */}
								<div className="space-y-2">
									<Skeleton className="bg-muted/30 h-5 w-full" />
									<Skeleton className="bg-muted/30 h-5 w-full" />
									<Skeleton className="bg-muted/30 h-5 w-4/5" />
								</div>

								{/* Bloc d'informations (adresse, etc.) */}
								{i % 2 === 0 && (
									<div className="bg-muted/20 ml-4 space-y-2 rounded-lg p-4">
										{Array.from({ length: 5 }).map((_, j) => (
											<Skeleton key={j} className="bg-muted/40 h-4 w-full max-w-xs" />
										))}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</section>
		</>
	);
}
