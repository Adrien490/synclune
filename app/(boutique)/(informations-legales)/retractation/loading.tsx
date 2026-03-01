import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Loading state for Withdrawal/Retractation page
 * Structure : PageHeader + Prose (sections avec titres, paragraphes, listes)
 */
export default function RetractationLoading() {
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
					<Skeleton className="bg-muted/50 mb-4 h-10 w-full max-w-lg" />

					{/* Description skeleton */}
					<Skeleton className="bg-muted/30 h-5 w-full max-w-3xl" />
				</div>
			</div>

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
									<Skeleton className="bg-muted/30 h-5 w-5/6" />
								</div>

								{/* Formulaire skeleton (section 2-3) */}
								{i === 2 && (
									<div className="bg-muted/20 space-y-4 rounded-lg border p-6">
										<Skeleton className="bg-muted/50 h-6 w-64" />
										<div className="space-y-3">
											{Array.from({ length: 6 }).map((_, j) => (
												<div key={j} className="space-y-2">
													<Skeleton className="bg-muted/40 h-4 w-32" />
													<Skeleton className="bg-muted/30 h-10 w-full rounded-md" />
												</div>
											))}
										</div>
									</div>
								)}

								{/* Liste optionnelle */}
								{i % 2 === 0 && (
									<div className="ml-4 space-y-2">
										{Array.from({ length: 3 }).map((_, j) => (
											<div key={j} className="flex gap-2">
												<Skeleton className="bg-muted/40 mt-2 h-2 w-2 shrink-0 rounded-full" />
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
		</>
	);
}
