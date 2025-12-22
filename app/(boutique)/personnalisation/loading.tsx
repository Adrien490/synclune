import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Loading state for customization page
 * Matches the structure of the page:
 * - PageHeader with breadcrumbs
 * - Split layout: Form (left) + Sidebar (right on desktop)
 * - Form fields: Type bijou, Description, Créations, Prénom/Nom, Email, Téléphone, RGPD
 */
export default function CustomizationLoading() {
	return (
		<div className="relative min-h-screen" role="status" aria-busy="true" aria-label="Chargement du formulaire de personnalisation">
			<span className="sr-only">Chargement du formulaire de personnalisation...</span>

			{/* Page Header Skeleton */}
			<div className="pt-16">
				<section className="bg-background border-b border-border">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
						<div className="space-y-2">
							{/* Breadcrumbs */}
							<nav className="text-sm">
								<div className="flex items-center gap-2">
									<Skeleton className="h-4 w-16 bg-muted/40" />
									<span className="text-muted-foreground">/</span>
									<Skeleton className="h-4 w-32 bg-muted/40" />
								</div>
							</nav>

							{/* Title */}
							<Skeleton className="h-8 sm:h-9 w-80 bg-muted/50" />

							{/* Description */}
							<Skeleton className="h-5 w-full max-w-sm bg-muted/30" />
						</div>
					</div>
				</section>
			</div>

			{/* Main Content */}
			<section className={`bg-background ${SECTION_SPACING.compact} relative z-10`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					{/* Layout split : formulaire + sidebar sur desktop */}
					<div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-12">
						{/* Formulaire de personnalisation */}
						<div className="max-w-xl space-y-6">
							{/* Required fields note */}
							<Skeleton className="h-4 w-48 bg-muted/30" />

							{/* Type de bijou (optionnel) - Pills/Chips */}
							<div className="space-y-3">
								<Skeleton className="h-4 w-28 bg-muted/40" />
								<div className="flex flex-wrap gap-2">
									{[...Array(5)].map((_, i) => (
										<Skeleton
											key={i}
											className="h-10 rounded-full bg-muted/30"
											style={{ width: `${70 + Math.random() * 40}px` }}
										/>
									))}
								</div>
							</div>

							{/* Description du projet - Textarea */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-36 bg-muted/40" />
								<Skeleton className="h-32 w-full bg-muted/30 rounded-md" />
								<Skeleton className="h-3 w-32 ml-auto bg-muted/20" />
							</div>

							{/* Créations inspirantes - Autocomplete */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-44 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
								<Skeleton className="h-3 w-40 bg-muted/20" />
							</div>

							{/* Prénom & Nom (2 cols) */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-2">
									<Skeleton className="h-4 w-16 bg-muted/40" />
									<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
								</div>
								<div className="space-y-2">
									<Skeleton className="h-4 w-12 bg-muted/40" />
									<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
								</div>
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

						{/* Sidebar - desktop uniquement */}
						<aside className="hidden lg:block space-y-6">
							{/* Sidebar card */}
							<div className="sticky top-24 space-y-6">
								{/* Image placeholder */}
								<Skeleton className="aspect-square w-full rounded-lg bg-muted/30" />

								{/* Testimonial card */}
								<div className="border border-border rounded-lg p-6 space-y-4">
									<div className="flex items-center gap-3">
										<Skeleton className="h-12 w-12 rounded-full bg-muted/40" />
										<div className="space-y-1">
											<Skeleton className="h-4 w-24 bg-muted/40" />
											<Skeleton className="h-3 w-16 bg-muted/30" />
										</div>
									</div>
									<Skeleton className="h-20 w-full bg-muted/20" />
								</div>
							</div>
						</aside>
					</div>

					{/* Témoignage mobile */}
					<div className="lg:hidden mt-12 space-y-2">
						<Skeleton className="h-5 w-28 bg-muted/40" />
						<Skeleton className="h-4 w-56 bg-muted/30" />
						<div className="border border-border rounded-lg p-4 mt-4 space-y-3">
							<div className="flex items-center gap-3">
								<Skeleton className="h-10 w-10 rounded-full bg-muted/40" />
								<div className="space-y-1">
									<Skeleton className="h-4 w-20 bg-muted/40" />
									<Skeleton className="h-3 w-14 bg-muted/30" />
								</div>
							</div>
							<Skeleton className="h-16 w-full bg-muted/20" />
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
