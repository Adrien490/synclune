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
			<div className="relative bg-background border-b border-border">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl py-8 sm:py-10 lg:py-12">
					{/* Breadcrumbs skeleton */}
					<div className="mb-6 flex items-center gap-2">
						<Skeleton className="h-4 w-16 bg-muted/40" />
						<span className="text-muted-foreground">/</span>
						<Skeleton className="h-4 w-32 bg-muted/40" />
					</div>

					{/* Title skeleton */}
					<Skeleton className="h-10 w-80 bg-muted/50 mb-4" />

					{/* Description skeleton */}
					<Skeleton className="h-5 w-full max-w-2xl bg-muted/30" />
				</div>
			</div>

			{/* Content skeleton */}
			<section className={`bg-background ${SECTION_SPACING.default}`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="prose prose-slate dark:prose-invert max-w-prose space-y-6">
						{/* Date de mise à jour */}
						<Skeleton className="h-4 w-64 bg-muted/30" />

						{/* Sections multiples */}
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="space-y-4 pt-4">
								{/* Titre section h2 */}
								<Skeleton className="h-8 w-72 bg-muted/50" />

								{/* Paragraphes */}
								<div className="space-y-2">
									<Skeleton className="h-5 w-full bg-muted/30" />
									<Skeleton className="h-5 w-full bg-muted/30" />
									<Skeleton className="h-5 w-4/5 bg-muted/30" />
								</div>

								{/* Bloc d'informations (adresse, etc.) */}
								{i % 2 === 0 && (
									<div className="ml-4 space-y-2 bg-muted/20 p-4 rounded-lg">
										{Array.from({ length: 5 }).map((_, j) => (
											<Skeleton key={j} className="h-4 w-full max-w-xs bg-muted/40" />
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
