import type { CSSProperties } from "react";

import { cn } from "@/shared/utils/cn";

/**
 * Scènes illustrées « fait main » des polaroids de l'atelier — intérim honnête
 * en attendant les vraies photos (cf. TODO(photos-atelier) dans atelier-section.tsx :
 * le swap consiste à remplacer <PolaroidIllustration> par <Image>).
 *
 * Même grammaire que step-illustrations.tsx : stroke currentColor, traits ronds,
 * fills pastel ponctuels (fillOpacity 0.15), dessin scroll-driven via
 * `doodle-draw doodle-draw-scroll` (reduced-motion + Safari ≤ 18 gérés par le CSS).
 * `pathLength={100}` normalise le dash (pas d'estimation manuelle de longueur).
 *
 * Décoratives pures (`aria-hidden`) : les captions du PolaroidFrame portent le sens.
 */

export interface PolaroidIllustrationProps {
	className?: string;
}

const STROKE_PROPS = {
	stroke: "currentColor",
	strokeLinecap: "round" as const,
	strokeLinejoin: "round" as const,
	fill: "none",
};

/** Dash normalisé + délai échelonné du fallback load (ignoré en scroll-driven). */
function drawStyle(delaySeconds: number): CSSProperties {
	return { "--path-length": "100", "--draw-delay": `${delaySeconds}s` } as CSSProperties;
}

const DRAW_CLASS = "doodle-draw doodle-draw-scroll";

function IllustrationSvg({
	className,
	children,
}: PolaroidIllustrationProps & { children: React.ReactNode }) {
	return (
		<svg
			viewBox="0 0 120 90"
			className={cn("text-foreground/60 pointer-events-none h-full w-full", className)}
			aria-hidden="true"
			focusable="false"
		>
			{children}
		</svg>
	);
}

/** Les mains dans les perles — deux paumes en coupe, perles flottantes, étincelles. */
export function HandsIllustration({ className }: PolaroidIllustrationProps) {
	return (
		<IllustrationSvg className={className}>
			{/* Paumes en coupe (2 courbes miroirs + pouces) */}
			<path
				d="M12 84 C20 68, 34 60, 50 62 M16 78 C24 70, 34 66, 44 66 M108 84 C100 68, 86 60, 70 62 M104 78 C96 70, 86 66, 76 66"
				strokeWidth={1.8}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0)}
			/>
			{/* Perles flottantes (2 remplies pastel) */}
			<circle
				cx={48}
				cy={44}
				r={4}
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				fill="currentColor"
				fillOpacity={0.15}
				className={DRAW_CLASS}
				style={drawStyle(0.15)}
			/>
			<circle
				cx={60}
				cy={35}
				r={5}
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0.15)}
			/>
			<circle
				cx={72}
				cy={44}
				r={3.5}
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				fill="currentColor"
				fillOpacity={0.15}
				className={DRAW_CLASS}
				style={drawStyle(0.2)}
			/>
			<circle
				cx={55}
				cy={52}
				r={3}
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0.2)}
			/>
			<circle
				cx={66}
				cy={53}
				r={4}
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0.25)}
			/>
			{/* Étincelles */}
			<path
				d="M30 20 L30 28 M26 24 L34 24 M88 14 L88 22 M84 18 L92 18"
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0.3)}
			/>
		</IllustrationSvg>
	);
}

/** Mes petits trésors — coupelle de perles qui débordent, fil, mini étoile et cœur. */
export function MaterialsIllustration({ className }: PolaroidIllustrationProps) {
	return (
		<IllustrationSvg className={className}>
			{/* Coupelle */}
			<path
				d="M28 60 C30 74, 90 74, 92 60 M24 58 C40 65, 80 65, 96 58"
				strokeWidth={1.8}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0)}
			/>
			{/* Perles (dedans + une échappée) */}
			<circle
				cx={44}
				cy={54}
				r={5}
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				fill="currentColor"
				fillOpacity={0.15}
				className={DRAW_CLASS}
				style={drawStyle(0.15)}
			/>
			<circle
				cx={56}
				cy={51}
				r={4}
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0.15)}
			/>
			<circle
				cx={68}
				cy={54}
				r={5}
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				fill="currentColor"
				fillOpacity={0.15}
				className={DRAW_CLASS}
				style={drawStyle(0.2)}
			/>
			<circle
				cx={78}
				cy={50}
				r={3.5}
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0.2)}
			/>
			<circle
				cx={35}
				cy={50}
				r={3.5}
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0.2)}
			/>
			<circle
				cx={102}
				cy={68}
				r={3}
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0.25)}
			/>
			{/* Fil qui serpente */}
			<path
				d="M96 54 C108 46, 104 34, 96 28 C90 23, 92 14, 100 12"
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0.25)}
			/>
			{/* Mini étoile + mini cœur (échos des doodles) */}
			<path
				d="M24 20 L25.5 24.5 L30 24.5 L26.5 27.5 L28 32 L24 29 L20 32 L21.5 27.5 L18 24.5 L22.5 24.5 Z"
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				fill="currentColor"
				fillOpacity={0.15}
				className={DRAW_CLASS}
				style={drawStyle(0.3)}
			/>
			<path
				d="M46 26 C42 23, 42 17.5, 45.5 17.5 C47.5 17.5, 48 19.5, 48 20 C48 19.5, 48.5 17.5, 50.5 17.5 C54 17.5, 54 23, 50 26 L48 27.5 Z"
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				fill="currentColor"
				fillOpacity={0.15}
				className={DRAW_CLASS}
				style={drawStyle(0.3)}
			/>
		</IllustrationSvg>
	);
}

/** L'inspiration du jour — carnet ouvert, croquis de boucle, croissant de lune Synclune. */
export function InspirationIllustration({ className }: PolaroidIllustrationProps) {
	return (
		<IllustrationSvg className={className}>
			{/* Carnet ouvert (2 pages + reliure) */}
			<path
				d="M22 26 C34 21, 46 21, 58 26 L58 70 C46 65, 34 65, 22 70 Z M94 26 C82 21, 70 21, 58 26 M94 26 L94 70 C82 65, 70 65, 58 70"
				strokeWidth={1.8}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0)}
			/>
			{/* Lignes d'écriture (page gauche) */}
			<path
				d="M28 36 C36 34, 44 34, 52 35 M28 44 C36 42, 42 42, 50 43 M28 52 C34 50, 40 50, 47 51"
				strokeWidth={1.2}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0.15)}
			/>
			{/* Croquis boucle d'oreille (page droite) : crochet + lien + pendant */}
			<path
				d="M74 34 C71 31, 71 27, 75 27 C78 27, 78 31, 76 33 M75 35 L75 38"
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0.2)}
			/>
			<circle
				cx={75}
				cy={47}
				r={8}
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				fill="currentColor"
				fillOpacity={0.15}
				className={DRAW_CLASS}
				style={drawStyle(0.25)}
			/>
			{/* Croissant de lune (clin d'œil Synclune) + étincelle */}
			<path
				d="M104 14 C99 15, 96 20, 98 25 C93 22, 93 14, 99 11 C101 10, 103 12, 104 14 Z"
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				fill="currentColor"
				fillOpacity={0.15}
				className={DRAW_CLASS}
				style={drawStyle(0.3)}
			/>
			<path
				d="M14 14 L14 20 M11 17 L17 17"
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0.3)}
			/>
		</IllustrationSvg>
	);
}

/** Mon coin créatif — établi, lampe, pot à pinceaux, guirlande de perles, mug fumant. */
export function WorkspaceIllustration({ className }: PolaroidIllustrationProps) {
	return (
		<IllustrationSvg className={className}>
			{/* Établi + pieds */}
			<path
				d="M6 72 C40 70, 80 70, 114 72 M18 72 L18 84 M102 72 L102 84"
				strokeWidth={1.8}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0)}
			/>
			{/* Lampe articulée */}
			<path
				d="M20 72 L32 72 M26 71 L22 52 L34 40 M30 36 C36 31, 43 35, 40 42 C38 45, 33 45, 31 42 M40 46 L44 53 M35 47 L37 54"
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0.15)}
			/>
			{/* Pot à pinceaux */}
			<path
				d="M52 72 L54 57 L68 57 L70 72 Z M57 57 L55 44 M61 57 L61 40 M65 57 L68 46"
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0.2)}
			/>
			{/* Mug + vapeur */}
			<path
				d="M78 72 L78 61 L90 61 L90 72 M90 63 C95 63, 95 69, 90 69 M81 56 C79 52, 83 50, 81 46 M86 56 C84 52, 88 50, 86 46"
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0.25)}
			/>
			{/* Guirlande de perles tombant du coin haut-droit */}
			<path
				d="M114 4 C106 12, 103 22, 107 34"
				strokeWidth={1.5}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0.3)}
			/>
			<circle
				cx={111}
				cy={9}
				r={2.5}
				strokeWidth={1.2}
				pathLength={100}
				{...STROKE_PROPS}
				fill="currentColor"
				fillOpacity={0.15}
				className={DRAW_CLASS}
				style={drawStyle(0.3)}
			/>
			<circle
				cx={105}
				cy={19}
				r={3}
				strokeWidth={1.2}
				pathLength={100}
				{...STROKE_PROPS}
				className={DRAW_CLASS}
				style={drawStyle(0.35)}
			/>
			<circle
				cx={106}
				cy={29}
				r={2.5}
				strokeWidth={1.2}
				pathLength={100}
				{...STROKE_PROPS}
				fill="currentColor"
				fillOpacity={0.15}
				className={DRAW_CLASS}
				style={drawStyle(0.35)}
			/>
		</IllustrationSvg>
	);
}
