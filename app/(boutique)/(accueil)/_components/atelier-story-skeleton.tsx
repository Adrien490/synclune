import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";

/**
 * Skeleton de chargement pour la section AtelierStory
 * Reproduit exactement la structure pour éviter le CLS
 */
export function AtelierStorySkeleton() {
	return (
		<section
			className={`relative overflow-hidden bg-muted/20 mask-t-from-90% mask-t-to-100% ${SECTION_SPACING.spacious}`}
			aria-label="Chargement de la section atelier"
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Header skeleton */}
				<div className="mb-10 text-center lg:mb-14">
					<Skeleton className="h-10 sm:h-12 w-48 mx-auto bg-muted/50" />
					<Skeleton className="h-5 w-56 mx-auto mt-5 bg-muted/30" />
				</div>

				{/* Bloc de texte centré - affiché avant la photo */}
				<div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6">
					{/* Titre accrocheur "Je vais vous faire une confidence" */}
					<Skeleton className="h-10 sm:h-12 w-full max-w-md mx-auto bg-muted/50" />

					{/* 3 paragraphes de texte narratif */}
					<div className="space-y-4 sm:space-y-6">
						{/* Paragraphe 1 */}
						<div className="space-y-2">
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
					</div>

					{/* Signature "— Léane" */}
					<Skeleton className="h-8 w-24 mx-auto bg-muted/30 mt-4" />
				</div>

				{/* Séparateur décoratif avec 3 sparkles */}
				<div
					className="flex justify-center items-center gap-3 my-8 sm:my-12"
					aria-hidden="true"
				>
					<Skeleton className="h-4 w-4 rounded-full bg-muted/30" />
					<Skeleton className="h-5 w-5 rounded-full bg-muted/40" />
					<Skeleton className="h-4 w-4 rounded-full bg-muted/30" />
				</div>

				{/* Image principale - contenue avec bords arrondis et fondu bas */}
				<div className="mb-8 sm:mb-12 mask-b-from-85% mask-b-to-100%">
					<Skeleton className="w-full aspect-3/2 sm:aspect-video max-h-[40vh] sm:max-h-none rounded-2xl bg-muted/40" />
				</div>

				{/* Section polaroids */}
				<div className="mt-12 sm:mt-16 space-y-8">
					<div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-2 max-w-5xl mx-auto">
						<Skeleton className="w-full aspect-4/3 rounded-xl bg-muted/40" />
						<Skeleton className="w-full aspect-4/3 rounded-xl bg-muted/40" />
						<Skeleton className="hidden lg:block w-full aspect-4/3 rounded-xl bg-muted/40" />
						<Skeleton className="hidden lg:block w-full aspect-4/3 rounded-xl bg-muted/40" />
					</div>

					{/* CTA skeleton */}
					<div className="text-center">
						<Skeleton className="h-5 w-56 mx-auto bg-muted/30" />
					</div>
				</div>
			</div>
		</section>
	);
}
