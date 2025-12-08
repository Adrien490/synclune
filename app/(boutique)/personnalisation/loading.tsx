import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Loading state for contact page
 * Matches the exact structure of page.tsx:
 * - PageHeader (title, description, breadcrumbs)
 * - ContactForm with 3 sections in FormLayout
 */
export default function ContactLoading() {
	return (
		<div className="min-h-screen" role="status" aria-busy="true" aria-label="Chargement du formulaire de contact">
			<span className="sr-only">Chargement du formulaire de contact...</span>

			{/* Page Header Skeleton - Uses PageHeader component */}
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
							<Skeleton className="h-8 sm:h-9 w-56 bg-muted/50" />

							{/* Description */}
							<Skeleton className="h-5 w-full max-w-2xl bg-muted/30" />
						</div>
					</div>
				</section>
			</div>

			{/* Main Content - Contact Form */}
			<section className={`bg-background ${SECTION_SPACING.compact}`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					{/* Contact Form Card */}
					<div className="space-y-8">
						{/* Required fields note */}
						<Skeleton className="h-4 w-64 bg-muted/30" />

						{/* FormLayout: 2 sections side by side on desktop */}
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
							{/* SECTION 1: Coordonnées */}
							<div className="bg-card border border-border rounded-lg p-6 space-y-6">
								{/* Section header */}
								<div className="flex items-center gap-3">
									<Skeleton className="h-5 w-5 rounded-full bg-muted/40" />
									<div className="space-y-1">
										<Skeleton className="h-5 w-40 bg-muted/50" />
										<Skeleton className="h-4 w-56 bg-muted/30" />
									</div>
								</div>

								{/* Prénom & Nom (2 cols) */}
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Skeleton className="h-4 w-16 bg-muted/40" />
										<Skeleton className="h-10 w-full bg-muted/30" />
									</div>
									<div className="space-y-2">
										<Skeleton className="h-4 w-16 bg-muted/40" />
										<Skeleton className="h-10 w-full bg-muted/30" />
									</div>
								</div>

								{/* Email */}
								<div className="space-y-2">
									<Skeleton className="h-4 w-24 bg-muted/40" />
									<Skeleton className="h-10 w-full bg-muted/30" />
								</div>

								{/* Phone */}
								<div className="space-y-2">
									<Skeleton className="h-4 w-20 bg-muted/40" />
									<Skeleton className="h-10 w-full bg-muted/30" />
									<Skeleton className="h-3 w-64 bg-muted/20" />
								</div>
							</div>

							{/* SECTION 2: Projet de personnalisation */}
							<div className="bg-card border border-border rounded-lg p-6 space-y-6">
								{/* Section header */}
								<div className="flex items-center gap-3">
									<Skeleton className="h-5 w-5 rounded-full bg-muted/40" />
									<div className="space-y-1">
										<Skeleton className="h-5 w-48 bg-muted/50" />
										<Skeleton className="h-4 w-64 bg-muted/30" />
									</div>
								</div>

								{/* Type de bijou */}
								<div className="space-y-2">
									<Skeleton className="h-4 w-28 bg-muted/40" />
									<Skeleton className="h-10 w-full bg-muted/30" />
								</div>

								{/* Détails de personnalisation */}
								<div className="space-y-2">
									<Skeleton className="h-4 w-40 bg-muted/40" />
									<Skeleton className="h-48 w-full bg-muted/30" />
									<Skeleton className="h-3 w-32 ml-auto bg-muted/20" />
								</div>

								{/* Pièce jointe */}
								<div className="space-y-2">
									<Skeleton className="h-4 w-40 bg-muted/40" />
									<Skeleton className="h-36 w-full bg-muted/30 rounded-lg" />
									<Skeleton className="h-3 w-64 bg-muted/20" />
								</div>
							</div>
						</div>

						{/* SECTION 3: Consentements */}
						<div className="bg-card border border-border rounded-lg p-6 space-y-6">
							{/* Section header */}
							<div className="flex items-center gap-3">
								<Skeleton className="h-5 w-5 rounded-full bg-muted/40" />
								<div className="space-y-1">
									<Skeleton className="h-5 w-32 bg-muted/50" />
									<Skeleton className="h-4 w-56 bg-muted/30" />
								</div>
							</div>

							{/* RGPD Consent */}
							<div className="space-y-2">
								<div className="flex items-start gap-3">
									<Skeleton className="h-4 w-4 rounded bg-muted/40 mt-0.5" />
									<Skeleton className="h-4 w-64 bg-muted/30" />
								</div>
								<Skeleton className="h-3 w-48 ml-7 bg-muted/20" />
							</div>

							{/* Newsletter */}
							<div className="space-y-2">
								<div className="flex items-start gap-3">
									<Skeleton className="h-4 w-4 rounded bg-muted/40 mt-0.5" />
									<Skeleton className="h-4 w-80 bg-muted/30" />
								</div>
							</div>
						</div>

						{/* Footer avec boutons */}
						<div className="mt-6">
							<div className="flex flex-col sm:flex-row justify-end gap-3">
								<Skeleton className="h-12 w-full sm:w-40 bg-muted/30" />
								<Skeleton className="h-12 w-full sm:w-56 bg-primary/20" />
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
