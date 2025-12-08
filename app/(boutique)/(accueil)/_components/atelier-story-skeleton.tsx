import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Skeleton de chargement pour la section AtelierStory
 * Reproduit exactement la structure pour éviter le CLS
 */
export function AtelierStorySkeleton() {
	return (
		<section
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.default}`}
			aria-label="Chargement de la section atelier"
		>
			<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
				{/* Image principale - aspect 4:3 mobile, 16:9 desktop */}
				<div className="mb-8 sm:mb-12">
					<Skeleton className="w-full aspect-[4/3] sm:aspect-[16/9] rounded-xl bg-muted/40" />
				</div>

				{/* Séparateur décoratif avec 3 sparkles */}
				<div
					className="flex justify-center items-center gap-3 mb-8 sm:mb-12"
					aria-hidden="true"
				>
					<Skeleton className="h-4 w-4 rounded-full bg-muted/30" />
					<Skeleton className="h-5 w-5 rounded-full bg-muted/40" />
					<Skeleton className="h-4 w-4 rounded-full bg-muted/30" />
				</div>

				{/* Bloc de texte centré */}
				<div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6">
					{/* Badge "Depuis mon atelier" */}
					<Skeleton className="h-5 w-36 mx-auto bg-muted/30" />

					{/* Titre accrocheur "Je vais te faire une confidence" */}
					<Skeleton className="h-10 sm:h-12 w-full max-w-md mx-auto bg-muted/50" />

					{/* 4 paragraphes de texte narratif */}
					<div className="space-y-4 sm:space-y-6">
						{/* Paragraphe 1 */}
						<div className="space-y-2">
							<Skeleton className="h-5 w-full bg-muted/30" />
							<Skeleton className="h-5 w-full bg-muted/30" />
							<Skeleton className="h-5 w-3/4 mx-auto bg-muted/30" />
						</div>
						{/* Paragraphe 2 */}
						<div className="space-y-2">
							<Skeleton className="h-5 w-full bg-muted/30" />
							<Skeleton className="h-5 w-full bg-muted/30" />
							<Skeleton className="h-5 w-5/6 mx-auto bg-muted/30" />
						</div>
						{/* Paragraphe 3 */}
						<div className="space-y-2">
							<Skeleton className="h-5 w-full bg-muted/30" />
							<Skeleton className="h-5 w-full bg-muted/30" />
							<Skeleton className="h-5 w-4/5 mx-auto bg-muted/30" />
						</div>
						{/* Paragraphe emphase (plus visible) */}
						<div className="space-y-2">
							<Skeleton className="h-6 w-3/4 mx-auto bg-muted/40" />
							<Skeleton className="h-6 w-2/3 mx-auto bg-muted/40" />
						</div>
					</div>

					{/* Signature "— Léane" */}
					<Skeleton className="h-8 w-24 mx-auto bg-muted/30 mt-4" />
				</div>

				{/* Section images secondaires + CTA */}
				<div className="mt-12 sm:mt-16 space-y-10">
					{/* Grid 2 images */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
						<Skeleton className="w-full aspect-[4/3] rounded-xl bg-muted/40" />
						<Skeleton className="w-full aspect-[4/3] rounded-xl bg-muted/40" />
					</div>

					{/* CTA centré */}
					<div className="flex flex-col items-center gap-4">
						<Skeleton className="h-5 w-64 bg-muted/30" />
						<Skeleton className="h-12 w-64 rounded-lg bg-muted/40 shadow-md" />
					</div>
				</div>
			</div>
		</section>
	);
}
