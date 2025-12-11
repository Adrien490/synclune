import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Loading state for customization page
 * Matches the exact structure of CustomizationForm:
 * - Section 1: Projet de bijou (Type + Textarea)
 * - Section 2: Inspirations (Autocomplete + 2 cols couleurs/materiaux)
 * - Section 3: Coordonnees (2 cols Prenom/Nom + Email + Tel)
 * - Section 4: Confidentialite (Checkbox)
 */
export default function CustomizationLoading() {
	return (
		<div className="min-h-screen" role="status" aria-busy="true" aria-label="Chargement du formulaire de personnalisation">
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
							<Skeleton className="h-8 sm:h-9 w-72 bg-muted/50" />

							{/* Description */}
							<Skeleton className="h-5 w-full max-w-md bg-muted/30" />
						</div>
					</div>
				</section>
			</div>

			{/* Main Content - Customization Form */}
			<section className={`bg-background ${SECTION_SPACING.compact}`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					<div className="space-y-8">
						{/* Required fields note */}
						<Skeleton className="h-4 w-64 bg-muted/30" />

						{/* SECTION 1: Projet de bijou */}
						<div className="bg-card border border-border rounded-lg p-6 space-y-6">
							{/* Section header */}
							<div className="flex items-center gap-3 border-b pb-4">
								<Skeleton className="h-5 w-5 rounded-full bg-muted/40" />
								<div className="space-y-1">
									<Skeleton className="h-5 w-40 bg-muted/50" />
									<Skeleton className="h-4 w-72 bg-muted/30" />
								</div>
							</div>

							{/* Type de bijou */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-28 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30" />
							</div>

							{/* Details du projet */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-36 bg-muted/40" />
								<Skeleton className="h-36 w-full bg-muted/30" />
								<Skeleton className="h-3 w-32 ml-auto bg-muted/20" />
							</div>
						</div>

						{/* SECTION 2: Inspirations et preferences */}
						<div className="bg-card border border-border rounded-lg p-6 space-y-6">
							{/* Section header */}
							<div className="flex items-center gap-3 border-b pb-4">
								<Skeleton className="h-5 w-5 rounded-full bg-muted/40" />
								<div className="space-y-1">
									<Skeleton className="h-5 w-48 bg-muted/50" />
									<Skeleton className="h-4 w-56 bg-muted/30" />
								</div>
							</div>

							{/* Creations inspirantes - pleine largeur */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-40 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30" />
								<Skeleton className="h-3 w-40 bg-muted/20" />
							</div>

							{/* Couleurs et Materiaux - 2 colonnes */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-2">
									<Skeleton className="h-4 w-32 bg-muted/40" />
									<Skeleton className="h-10 w-full bg-muted/30" />
								</div>
								<div className="space-y-2">
									<Skeleton className="h-4 w-36 bg-muted/40" />
									<Skeleton className="h-10 w-full bg-muted/30" />
								</div>
							</div>
						</div>

						{/* SECTION 3: Coordonnees */}
						<div className="bg-card border border-border rounded-lg p-6 space-y-6">
							{/* Section header */}
							<div className="flex items-center gap-3 border-b pb-4">
								<Skeleton className="h-5 w-5 rounded-full bg-muted/40" />
								<div className="space-y-1">
									<Skeleton className="h-5 w-36 bg-muted/50" />
									<Skeleton className="h-4 w-64 bg-muted/30" />
								</div>
							</div>

							{/* Prenom & Nom (2 cols) */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-2">
									<Skeleton className="h-4 w-16 bg-muted/40" />
									<Skeleton className="h-10 w-full bg-muted/30" />
								</div>
								<div className="space-y-2">
									<Skeleton className="h-4 w-12 bg-muted/40" />
									<Skeleton className="h-10 w-full bg-muted/30" />
								</div>
							</div>

							{/* Email */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-28 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30" />
							</div>

							{/* Telephone */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-20 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30" />
								<Skeleton className="h-3 w-56 bg-muted/20" />
							</div>
						</div>

						{/* SECTION 4: Confidentialite */}
						<div className="bg-card border border-border rounded-lg p-6 space-y-6">
							{/* Section header */}
							<div className="flex items-center gap-3 border-b pb-4">
								<Skeleton className="h-5 w-5 rounded-full bg-muted/40" />
								<div className="space-y-1">
									<Skeleton className="h-5 w-32 bg-muted/50" />
									<Skeleton className="h-4 w-44 bg-muted/30" />
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
						</div>

						{/* Footer avec bouton */}
						<div className="mt-6">
							<div className="flex justify-end">
								<Skeleton className="h-12 w-full sm:w-52 bg-primary/20" />
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
