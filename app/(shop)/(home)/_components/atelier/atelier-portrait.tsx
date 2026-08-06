import Image from "next/image";
import type { CSSProperties } from "react";

import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import { HandDrawnAccent } from "@/shared/components/animations/hand-drawn-accent";
import { CARD_SURFACE_POLAROID } from "@/shared/components/card-surface.constants";
import { MaskingTape } from "@/shared/components/masking-tape";
import { cn } from "@/shared/utils/cn";

import { AtelierThreadStroke } from "./atelier-thread";

/**
 * Le portrait polaroid de Léane — l'ancre humaine de la section atelier.
 *
 * @description
 * Extrait de `atelier-section.tsx` (lot 2 du « fil ») pour que ses DEUX états
 * soient testables indépendamment de la valeur du moment de la SSOT
 * `ATELIER_IMAGE` (écart d de `docs/LANDING-SECTION-ATELIER.md`) :
 *
 * - **`src` renseignée** — le tirage : enveloppe polaroid, grain
 *   `polaroid-paper`, légende cursive « C'est moi, Léane ! ». Section sous la
 *   ligne de flottaison : `lazy` (défaut), aucun `preload`.
 * - **`src` null** — la plaque dessinée, une pièce de design, PAS un
 *   `onError` : tant que l'asset est mort (404), le cadre porte un cœur main
 *   levée sur le lavis de la section (2ᵉ consommateur du wash, après la
 *   confidence) et la légende assume l'attente. Plus jamais un trou blanc
 *   publié avec son alt. Tracé existant (`ACCENT_SHAPE_PATHS.heart`) — pas de
 *   tracé neuf sans besoin ; l'encre est le défaut cascadé
 *   (`--section-accent` = lavande).
 *
 * Le ruban `MaskingTape` est l'UNIQUE de la section (la photo est
 * littéralement scotchée) — ne pas en re-poser ailleurs.
 *
 * **Mobile (< lg), option A du gate maquette (2026-08-06)** : l'axe gauche est
 * CONSERVÉ (décision utilisateur, contre la reco « centrer ») et le vide de
 * ~131 px à droite du tirage devient la marge d'un carnet — une note cursive
 * annotée d'une étincelle lavande. `lg:hidden` : au-delà, le tirage remplit sa
 * colonne sticky de 22 rem, il n'y a plus de vide à meubler.
 */
export function AtelierPortrait({ src, alt }: { src: string | null; alt: string }) {
	return (
		<figure
			className={cn(
				CARD_SURFACE_POLAROID,
				"polaroid-paper enter-inview max-w-[15rem] -rotate-[1.2deg] sm:max-w-[17rem] lg:max-w-none",
			)}
			style={{ "--enter-y": "20px" } as CSSProperties}
		>
			<MaskingTape className="-top-2 left-1/2 z-20 h-4 w-14 -translate-x-1/2 -rotate-2" />
			<div className="relative aspect-4/5 overflow-hidden rounded-sm">
				{src ? (
					<Image
						src={src}
						alt={alt}
						fill
						// Colonne `22rem` moins la marge du tirage à `lg`, `15-17rem`
						// empilé en dessous.
						sizes="(min-width: 1024px) 21rem, 16rem"
						className="object-cover"
						quality={IMAGE_QUALITY.STANDARD}
					/>
				) : (
					<div className="flex size-full items-center justify-center bg-(--section-wash)">
						<HandDrawnAccent variant="heart" width={72} />
					</div>
				)}
			</div>
			<figcaption className="font-cursive text-muted-foreground px-1.5 pt-2.5 pb-3 text-center text-[0.9375rem] sm:px-2">
				{src ? (
					<>C&apos;est moi, Léane&nbsp;!</>
				) : (
					// La légende assume l'attente — une note d'atelier, dans la voix
					// de Léane (copie validée au gate maquette).
					<>Le portrait arrive — promis&nbsp;!</>
				)}
			</figcaption>

			{/* La note en marge (option A) — le vide mobile devient la marge d'un
			    carnet. Décorative : elle répète le lieu déjà porté par le chapô. */}
			<span
				aria-hidden="true"
				className="font-cursive text-muted-foreground absolute top-[22%] left-[calc(100%+0.75rem)] w-26 rotate-2 text-[0.9rem] leading-snug lg:hidden"
			>
				mon petit coin de création, à Nantes
				<AtelierThreadStroke name="sparkle" width={26} className="mt-1.5 block" />
			</span>
		</figure>
	);
}
