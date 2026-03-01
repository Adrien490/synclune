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
		<div
			className="relative min-h-screen"
			role="status"
			aria-busy="true"
			aria-label="Chargement du formulaire de personnalisation"
		>
			<span className="sr-only">Chargement du formulaire de personnalisation...</span>

			<PageHeaderSkeleton hasDescription />

			{/* Main Content */}
			<section className={`bg-background ${SECTION_SPACING.compact} relative z-10`}>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					{/* Layout split : formulaire + sidebar sur desktop */}
					<div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-12">
						{/* Formulaire de personnalisation */}
						<div className="max-w-xl space-y-6">
							{/* Required fields note */}
							<Skeleton className="bg-muted/30 h-4 w-48" />

							{/* Type de bijou (optionnel) - Select dropdown */}
							<div className="space-y-2">
								<Skeleton className="bg-muted/40 h-4 w-28" />
								<Skeleton className="bg-muted/30 h-10 w-full rounded-md" />
							</div>

							{/* Description du projet - Textarea */}
							<div className="space-y-2">
								<Skeleton className="bg-muted/40 h-4 w-36" />
								<Skeleton className="bg-muted/30 h-32 w-full rounded-md" />
								<Skeleton className="bg-muted/20 ml-auto h-3 w-32" />
							</div>

							{/* Prénom */}
							<div className="space-y-2">
								<Skeleton className="bg-muted/40 h-4 w-16" />
								<Skeleton className="bg-muted/30 h-10 w-full rounded-md" />
							</div>

							{/* Email */}
							<div className="space-y-2">
								<Skeleton className="bg-muted/40 h-4 w-28" />
								<Skeleton className="bg-muted/30 h-10 w-full rounded-md" />
							</div>

							{/* Téléphone */}
							<div className="space-y-2">
								<Skeleton className="bg-muted/40 h-4 w-20" />
								<Skeleton className="bg-muted/30 h-10 w-full rounded-md" />
							</div>

							{/* RGPD Consent */}
							<div className="space-y-1">
								<div className="flex items-start gap-3">
									<Skeleton className="bg-muted/40 mt-0.5 h-4 w-4 rounded" />
									<Skeleton className="bg-muted/30 h-4 w-64" />
								</div>
								<Skeleton className="bg-muted/20 ml-7 h-3 w-48" />
							</div>

							{/* Submit button */}
							<div className="flex justify-start">
								<Skeleton className="bg-primary/20 h-11 w-full rounded-md sm:w-52" />
							</div>
						</div>

						{/* Sidebar - "Comment ça marche" card */}
						<aside
							className="mt-8 self-start lg:sticky lg:top-24 lg:mt-0"
							aria-label="Informations sur le processus"
						>
							<div className="border-border bg-card space-y-6 rounded-xl border p-6">
								{/* Title */}
								<Skeleton className="bg-muted/40 h-5 w-44" />

								{/* 3 steps */}
								<div className="space-y-5">
									{[0, 1, 2].map((i) => (
										<div key={i} className="flex gap-4">
											<Skeleton className="bg-muted/40 size-9 shrink-0 rounded-full" />
											<div className="flex-1 space-y-1.5">
												<Skeleton className="bg-muted/40 h-4 w-32" />
												<Skeleton className="bg-muted/25 h-3 w-full" />
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
