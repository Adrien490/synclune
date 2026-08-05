import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";
import {
	CHAPTER_CONTAINER_CLASSES,
	CHAPTER_PRINT_FRAME_CLASSES,
	CHAPTER_PRINT_MEDIA_CLASSES,
	CHAPTER_PRINT_OVERLAP_CLASSES,
	CHAPTER_PRINT_ROTATIONS,
	CHAPTER_PRINT_STRIP_CLASSES,
	CHAPTER_STACK_CLASSES,
	CHAPTER_TEXT_RESERVES,
} from "./collection-chapter";

/**
 * Bandes annoncées pendant le chargement.
 *
 * Ce n'est PAS `perPage` (20 par défaut) : c'est ce qui recouvre un viewport —
 * une bande vaut ~304px à `lg` et ~366px en empilé. Annoncer du contenu SOUS le
 * pli ne prévient aucun décalage et gonfle le fallback ; en annoncer moins que
 * le pli en laisse un.
 */
const SKELETON_CHAPTER_COUNT = 3;

/**
 * Squelette du carnet des séries — miroir de `collection-chapters.tsx`.
 *
 * La géométrie interne (conteneur de bande, cadre et fenêtre des tirages,
 * rotations, chevauchement, bande de tirages, empilement) et les RÉSERVES
 * VERTICALES de la colonne texte (`CHAPTER_TEXT_RESERVES`) sont IMPORTÉES de
 * `collection-chapter.tsx` plutôt que recopiées : c'est la duplication des
 * littéraux qui avait fait diverger grille et squelette du temps de la
 * planche-contact (verrouillé par `collection-skeleton-parity.regression.test.ts`).
 *
 * ⚠️ Les réserves ne sont pas des hauteurs choisies à l'œil : chacune est le
 * produit `font-size × line-height` de l'élément réel, et le test refait le
 * calcul depuis la source. Cette colonne réservait 112px pour ~202px de réel
 * (description sur 4 lignes annoncée sur une, trait dessiné non réservé, `gap-3`
 * là où le réel a des marges) — ~90px de décalage par bande.
 *
 * L'encre de chaque bande dépend du slug, inconnu pendant le chargement : le
 * voile est neutre (`bg-muted/60`, au même poids perçu que les bandes réelles —
 * ΔE OKLab ≈ 0,030), jamais un accent deviné. Il est CONSTANT, comme le réel :
 * l'alternance d'opacité d'avant annonçait un rythme que la page n'a pas.
 */
export function CollectionChaptersSkeleton() {
	return (
		<div className="space-y-8">
			<div className={CHAPTER_STACK_CLASSES}>
				{Array.from({ length: SKELETON_CHAPTER_COUNT }).map((_, chapterIndex) => (
					<div key={chapterIndex} className="bg-muted/60">
						<div className={CHAPTER_CONTAINER_CLASSES}>
							<div className="flex flex-col">
								{/* Eyebrow « N créations ». */}
								<Skeleton className={cn(CHAPTER_TEXT_RESERVES.eyebrow, "w-24")} />
								{/* Titre display 1.75/2/2.5rem. */}
								<Skeleton className={cn(CHAPTER_TEXT_RESERVES.title, "w-52 max-w-full lg:w-64")} />
								{/* Trait dessiné — sa boîte native (120 × 20), toujours rendue. */}
								<Skeleton className={CHAPTER_TEXT_RESERVES.underline} />
								{/* Description — deux lignes, comme le `min-h` du <p> réel. */}
								<div className={CHAPTER_TEXT_RESERVES.description}>
									<Skeleton className="h-4 w-full max-w-72" />
									<Skeleton className="mt-1.5 h-4 w-full max-w-56" />
								</div>
								{/* From-price. */}
								<Skeleton className={cn(CHAPTER_TEXT_RESERVES.price, "w-28")} />
							</div>
							<div className={CHAPTER_PRINT_STRIP_CLASSES}>
								{CHAPTER_PRINT_ROTATIONS.map((rotation, printIndex) => (
									<div
										key={printIndex}
										className={cn(
											CHAPTER_PRINT_FRAME_CLASSES,
											rotation,
											printIndex > 0 && CHAPTER_PRINT_OVERLAP_CLASSES,
										)}
									>
										<Skeleton className={CHAPTER_PRINT_MEDIA_CLASSES} />
									</div>
								))}
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Pas de réservation pour la bande de pagination : elle ne se rend que
			 * si la liste dépasse une page (inconnaissable pendant le chargement),
			 * et elle vit sous le pli — aucun décalage VISIBLE au swap. */}
		</div>
	);
}
