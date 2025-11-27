import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for Privacy Policy page
 * Structure : PageHeader + Prose (sections avec titres, paragraphes, listes)
 */
export default function PrivacyPolicyLoading() {
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
					<Skeleton className="h-10 w-96 bg-muted/50 mb-4" />

					{/* Description skeleton */}
					<Skeleton className="h-5 w-full max-w-3xl bg-muted/30" />
				</div>
			</div>

			{/* Content skeleton */}
			<section className="bg-background py-12 lg:py-16">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
						{/* Date de mise à jour */}
						<Skeleton className="h-4 w-64 bg-muted/30" />

						{/* Sections multiples */}
						{Array.from({ length: 8 }).map((_, i) => (
							<div key={i} className="space-y-4 pt-4">
								{/* Titre section h2 */}
								<Skeleton className="h-8 w-96 bg-muted/50" />

								{/* Paragraphes */}
								<div className="space-y-2">
									<Skeleton className="h-5 w-full bg-muted/30" />
									<Skeleton className="h-5 w-full bg-muted/30" />
									<Skeleton className="h-5 w-5/6 bg-muted/30" />
								</div>

								{/* Liste optionnelle */}
								{i % 2 === 0 && (
									<div className="ml-4 space-y-2">
										{Array.from({ length: 3 }).map((_, j) => (
											<div key={j} className="flex gap-2">
												<Skeleton className="w-2 h-2 rounded-full bg-muted/40 mt-2 shrink-0" />
												<Skeleton className="h-5 w-full bg-muted/30" />
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
