import Image from "next/image";
import type { CSSProperties } from "react";

import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import { HandDrawnAccent } from "@/shared/components/animations/hand-drawn-accent";
import { CARD_SURFACE_POLAROID } from "@/shared/components/card-surface.constants";
import { HAND_DRAWN_STROKES } from "@/shared/components/hand-drawn/constants";
import { ATELIER_THREAD_PATHS } from "@/shared/components/hand-drawn/paths";
import { cn } from "@/shared/utils/cn";

import { AtelierThreadStroke } from "./atelier-thread";

/**
 * Le portrait polaroid de Léane — l'ancre humaine de la section atelier.
 *
 * @description
 * Extrait de `atelier-section.tsx` (lot 2 du « fil ») pour que ses DEUX états
 * soient testables indépendamment de la valeur du moment de la SSOT
 * `ATELIER_IMAGE` :
 *
 * - **`src` renseignée** — le tirage : enveloppe polaroid, grain
 *   `polaroid-paper`, légende cursive « C'est moi, Léane ! ». Section sous la
 *   ligne de flottaison : `lazy` (défaut), aucun `preload`.
 * - **`src` null** — la plaque dessinée, une pièce de design, PAS un
 *   `onError` : tant que l'asset est mort (404), le cadre porte un cœur main
 *   levée sur le lavis de la section (2ᵉ consommateur du wash, après la
 *   confidence) et la légende assume l'attente. Plus jamais un trou blanc
 *   publié avec son alt. Tracé existant (`ACCENT_SHAPE_PATHS.heart`) — pas de
 *   tracé neuf sans besoin.
 *
 *   ⚠️ **L'encre du cœur ne doit PAS être le défaut cascadé.** Depuis que la
 *   salle est rose, `--section-accent` vaut `--primary` — soit exactement la
 *   teinte dont `--section-wash` est fait : du rose sur lavis rose, mesuré à
 *   **1,53:1**, un cœur littéralement invisible sur une plaque de 362×476 px.
 *   C'est `--color-brand-rose-strong` qui est le rose LISIBLE (5,06:1 sur ce
 *   même lavis, mesuré) : même teinte 340,78, autre luminosité.
 *
 * **Mobile, option A du gate maquette (2026-08-06)** : l'axe gauche est
 * CONSERVÉ (décision utilisateur, contre la reco « centrer ») et le vide à
 * droite du tirage devient la marge d'un carnet — une note cursive annotée
 * d'une étincelle. ⚠️ Elle s'arrête à `sm` (et non plus à `lg`) : à partir de
 * là c'est `AtelierWorktable` (« Sur la table ») qui occupe ce flanc, et les
 * deux s'y disputeraient la place — c'était d'ailleurs elle, calibrée pour
 * 390 px, qui laissait ~420×370 px de blanc à 768.
 */
export function AtelierPortrait({ src, alt }: { src: string | null; alt: string }) {
	return (
		<figure
			className={cn(
				CARD_SURFACE_POLAROID,
				"polaroid-paper enter-inview max-w-[15rem] -rotate-[1.2deg]",
				// ⚠️ **Le tirage se dimensionnait sur la LONGUEUR DE SA LÉGENDE.** De `sm`
				// à `lg` la colonne est un flex en rangée avec `items-start`, et rien ne
				// réinitialisait cet alignement quand elle redevenait une colonne à `lg` :
				// la largeur du <figure> valait donc sa largeur de CONTENU — et son seul
				// contenu à largeur intrinsèque est le <figcaption>, la zone image étant un
				// cadre `aspect-4/5` vide. Le `lg:max-w-none` posé ici pour lui faire
				// remplir les 22 rem de la colonne était **inerte** : mesuré à 1280, la
				// figure faisait 231 px dans une colonne de 352.
				//
				// Conséquence, et c'est ce qui en faisait un défaut ARMÉ : en substituant
				// la légende du jour où la photo arrive (« C'est moi, Léane ! »), le cadre
				// tombait à **161 px — −31 %**, au moment exact où il a enfin quelque chose
				// à montrer. Une légende plus longue le poussait à 362.
				//
				// Une LARGEUR explicite, jamais un plafond : `w-full` en colonne (`lg`)
				// remplit la cellule quel que soit l'alignement, `w-[17rem] shrink-0` en
				// rangée (`sm`→`lg`) la fixe. La taille du portrait ne dépend plus d'un
				// texte.
				//
				// ⚠️ `sm:max-w-none` n'est PAS décoratif : un `max-width` plafonne une
				// largeur explicite, donc le `max-w-[15rem]` du mobile annulait en silence
				// et le `w-[17rem]` et le `w-full` (mesuré : 240 px rendus dans une colonne
				// de 352, exactement le défaut qu'on corrige, sous un autre nom).
				"sm:w-[17rem] sm:max-w-none sm:shrink-0 lg:w-full",
			)}
			style={{ "--enter-y": "20px" } as CSSProperties}
		>
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
						<HandDrawnAccent
							variant="heart"
							width={96}
							color="var(--color-brand-rose-strong)"
							strokeWidth={HAND_DRAWN_STROKES.trait}
						/>
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
			    carnet. Décorative : elle répète le lieu déjà porté par le chapô.
			    Masquée sous 24,25 rem (388 px = figure 240 + gap 12 + note 104 +
			    padding conteneur 32) : en deçà elle déborde le viewport et met un
			    scroll horizontal à la PAGE entière (mesuré : scrollWidth 375 à
			    320). Seuil en rem, jamais en px (SSOT breakpoints).
			    `sm:hidden` : au-delà, « Sur la table » occupe ce flanc. */}
			<span
				aria-hidden="true"
				className="font-cursive text-muted-foreground absolute top-[22%] left-[calc(100%+0.75rem)] hidden w-26 rotate-2 text-[0.9rem] leading-snug min-[24.25rem]:block sm:hidden"
			>
				mon petit coin de création, à Nantes
				<AtelierThreadStroke
					path={ATELIER_THREAD_PATHS.sparkle}
					width={26}
					className="mt-1.5 block"
				/>
			</span>
		</figure>
	);
}
