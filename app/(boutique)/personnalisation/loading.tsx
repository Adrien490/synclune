import { PageHeaderSkeleton } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Loading state for customization page
 * Matches the structure of the page:
 * - PageHeader with breadcrumbs
 * - Split layout: Form (left) + Sidebar (right on desktop)
 * - Form fields: Type bijou (select), Description, Prénom, Email, Téléphone, RGPD
 */
export default function CustomizationLoading() {
	return (
		<div className="relative min-h-screen" role="status" aria-busy="true" aria-label="Chargement du formulaire de personnalisation">
			<span className="sr-only">Chargement du formulaire de personnalisation...</span>

			<PageHeaderSkeleton hasDescription />

			{/* Main Content */}
			<section className={`bg-background ${SECTION_SPACING.compact} relative z-10`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					{/* Layout split : formulaire + sidebar sur desktop */}
					<div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-12">
						{/* Formulaire de personnalisation */}
						<div className="max-w-xl space-y-6">
							{/* Required fields note */}
							<Skeleton className="h-4 w-48 bg-muted/30" />

							{/* Type de bijou (optionnel) - Select dropdown */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-28 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
							</div>

							{/* Description du projet - Textarea */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-36 bg-muted/40" />
								<Skeleton className="h-32 w-full bg-muted/30 rounded-md" />
								<Skeleton className="h-3 w-32 ml-auto bg-muted/20" />
							</div>

							{/* Prénom */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-16 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
							</div>

							{/* Email */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-28 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
							</div>

							{/* Téléphone */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-20 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
							</div>

							{/* RGPD Consent */}
							<div className="space-y-1">
								<div className="flex items-start gap-3">
									<Skeleton className="h-4 w-4 rounded bg-muted/40 mt-0.5" />
									<Skeleton className="h-4 w-64 bg-muted/30" />
								</div>
								<Skeleton className="h-3 w-48 ml-7 bg-muted/20" />
							</div>

							{/* Submit button */}
							<div className="flex justify-start">
								<Skeleton className="h-11 w-full sm:w-52 bg-primary/20 rounded-md" />
							</div>
						</div>

						{/* Sidebar - "Comment ça marche" card */}
						<aside className="mt-8 lg:mt-0 lg:sticky lg:top-24 self-start" aria-label="Informations sur le processus">
							<div className="rounded-xl border border-border bg-card p-6 space-y-6">
								{/* Title */}
								<Skeleton className="h-5 w-44 bg-muted/40" />

								{/* 3 steps */}
								<div className="space-y-5">
									{[0, 1, 2].map((i) => (
										<div key={i} className="flex gap-4">
											<Skeleton className="size-9 shrink-0 rounded-full bg-muted/40" />
											<div className="space-y-1.5 flex-1">
												<Skeleton className="h-4 w-32 bg-muted/40" />
												<Skeleton className="h-3 w-full bg-muted/25" />
											</div>
										</div>
									))}
								</div>
							</div>
						</aside>
					</div>
				</div>
			</section>
		</div>
	);
}
