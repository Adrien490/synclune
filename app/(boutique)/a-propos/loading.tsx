import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Loading state for À propos page
 * Reproduit la structure : PageHeader + Contenu (Qui je suis, Inspirations, Réseaux sociaux, CTA)
 */
export default function AProposLoading() {
	return (
		<div className="min-h-screen">
			{/* PageHeader skeleton */}
			<div className="relative bg-background border-b border-border">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl py-8 sm:py-10 lg:py-12">
					{/* Breadcrumbs skeleton */}
					<div className="mb-6 flex items-center gap-2">
						<Skeleton className="h-4 w-16 bg-muted/40" />
						<span className="text-muted-foreground">/</span>
						<Skeleton className="h-4 w-20 bg-muted/40" />
					</div>

					{/* Title skeleton */}
					<Skeleton className="h-10 w-80 bg-muted/50 mb-4" />

					{/* Description skeleton */}
					<Skeleton className="h-5 w-full max-w-2xl bg-muted/30" />
				</div>
			</div>

			{/* Contenu principal skeleton */}
			<section className={`bg-background ${SECTION_SPACING.compact}`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
					{/* Qui je suis - Layout avec image */}
					<div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 lg:gap-12 items-start">
						{/* Placeholder image skeleton */}
						<div className="flex justify-center lg:justify-start">
							<Skeleton className="w-64 h-80 rounded-2xl bg-muted/40" />
						</div>

						{/* Texte skeleton */}
						<div className="space-y-6">
							<Skeleton className="h-8 w-96 max-w-full bg-muted/50" />
							<div className="space-y-4">
								<Skeleton className="h-5 w-full bg-muted/30" />
								<Skeleton className="h-5 w-full bg-muted/30" />
								<Skeleton className="h-5 w-5/6 bg-muted/30" />
								<Skeleton className="h-5 w-full bg-muted/30" />
								<Skeleton className="h-5 w-4/5 bg-muted/30" />
								<Skeleton className="h-5 w-full bg-muted/30" />
								<Skeleton className="h-5 w-3/4 bg-muted/30" />
							</div>
						</div>
					</div>

					{/* Mes inspirations */}
					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<Skeleton className="w-5 h-5 rounded bg-primary/30" />
							<Skeleton className="h-6 w-40 bg-muted/50" />
						</div>
						<div className="space-y-4">
							<Skeleton className="h-5 w-full bg-muted/30" />
							<Skeleton className="h-5 w-full bg-muted/30" />
							<Skeleton className="h-5 w-5/6 bg-muted/30" />
							<Skeleton className="h-5 w-full bg-muted/30" />
							<Skeleton className="h-5 w-4/5 bg-muted/30" />
						</div>
					</div>

					{/* Réseaux sociaux */}
					<div className="space-y-4 pt-4">
						<Skeleton className="h-4 w-64 bg-muted/40" />
						<div className="flex flex-col sm:flex-row gap-3">
							{/* Instagram card */}
							<div className="inline-flex items-center gap-3 px-5 py-3 rounded-lg border border-border bg-background shadow-sm flex-1">
								<Skeleton className="w-5 h-5 rounded bg-muted/40 shrink-0" />
								<div className="flex flex-col items-start gap-1 flex-1">
									<Skeleton className="h-4 w-32 bg-muted/50" />
									<Skeleton className="h-3 w-48 bg-muted/30" />
								</div>
							</div>

							{/* TikTok card */}
							<div className="inline-flex items-center gap-3 px-5 py-3 rounded-lg border border-border bg-background shadow-sm flex-1">
								<Skeleton className="w-5 h-5 rounded bg-muted/40 shrink-0" />
								<div className="flex flex-col items-start gap-1 flex-1">
									<Skeleton className="h-4 w-32 bg-muted/50" />
									<Skeleton className="h-3 w-48 bg-muted/30" />
								</div>
							</div>
						</div>
					</div>

					{/* CTA */}
					<div className="pt-8 space-y-6 text-center border-t border-border">
						<div className="space-y-3">
							<Skeleton className="h-8 w-80 mx-auto bg-muted/50" />
							<Skeleton className="h-5 w-full max-w-lg mx-auto bg-muted/30" />
						</div>

						<div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
							<Skeleton className="h-12 w-64 bg-primary/20 rounded-lg shadow-lg" />
							<Skeleton className="h-12 w-80 bg-muted/40 rounded-lg shadow-md" />
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
