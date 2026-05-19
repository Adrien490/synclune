import { cn } from "@/shared/utils/cn";
import type { ReactNode } from "react";

type TiltDirection = "left" | "right" | "none";
export type WashiTapeColor = "pink" | "lavender" | "mint" | "peach";
export type WashiTapePosition = "top-left" | "top-right" | "both";
export type PolaroidAspect = "polaroid" | "square" | "landscape" | "portrait";

interface PolaroidFrameProps {
	children: ReactNode;
	/** Rotation légère de la photo */
	tilt?: TiltDirection;
	/** Custom rotation in degrees (overrides tilt) */
	tiltDegree?: number;
	/** Légende manuscrite sous la photo */
	caption?: string;
	/** Custom caption color (CSS value) */
	captionColor?: string;
	/** Caption rotation in degrees */
	captionRotate?: number;
	/** Afficher du washi tape décoratif */
	washiTape?: boolean;
	/** Couleur du washi tape */
	washiColor?: WashiTapeColor;
	/** Secondary color for top-right washi tape (defaults via WASHI_COMPLEMENT) */
	washiColorSecondary?: WashiTapeColor;
	/** Position du washi tape */
	washiPosition?: WashiTapePosition;
	/** Subtle vintage photo filter */
	vintage?: boolean;
	/** Ratio du conteneur photo (défaut: polaroid 1/1.05 authentique) */
	aspectRatio?: PolaroidAspect;
	/**
	 * Active la navigation clavier (tabIndex={0} + focus-visible ring).
	 * Réserver aux cas où le polaroid est cliquable / lié (lightbox, lien PDP).
	 * Pour usage décoratif, laisser à false (défaut) pour ne pas polluer le tab order.
	 */
	interactive?: boolean;
	/** Description accessible pour SR (requis si interactive=true sans caption) */
	"aria-label"?: string;
	className?: string;
	style?: React.CSSProperties;
}

const TILT_DEGREES: Record<TiltDirection, number> = { left: -2, right: 2, none: 0 };

const tiltShadows: Record<TiltDirection, string> = {
	left: "2px 6px 20px rgba(0,0,0,0.13)",
	right: "-2px 6px 20px rgba(0,0,0,0.13)",
	none: "0 6px 20px rgba(0,0,0,0.12)",
};

const washiColors: Record<WashiTapeColor, string> = {
	pink: "bg-linear-to-r from-pink-200/65 to-pink-300/65",
	lavender: "bg-linear-to-r from-purple-200/65 to-purple-300/65",
	mint: "bg-linear-to-r from-green-200/65 to-green-300/65",
	peach: "bg-linear-to-r from-orange-200/65 to-orange-300/65",
};

const WASHI_COMPLEMENT: Record<WashiTapeColor, WashiTapeColor> = {
	pink: "lavender",
	lavender: "pink",
	mint: "peach",
	peach: "mint",
};

const aspectClasses: Record<PolaroidAspect, string> = {
	polaroid: "aspect-[1/1.05]",
	square: "aspect-square",
	landscape: "aspect-4/3",
	portrait: "aspect-3/4",
};

// Zigzag polygon simulating fibrous washi tape edges
const washiClipLeft =
	"polygon(2% 8%, 8% 0%, 15% 5%, 22% 0%, 30% 3%, 38% 0%, 45% 6%, 52% 0%, 60% 4%, 68% 0%, 75% 5%, 82% 0%, 90% 3%, 95% 0%, 100% 8%, 98% 50%, 100% 92%, 95% 100%, 88% 95%, 80% 100%, 72% 96%, 65% 100%, 58% 94%, 50% 100%, 42% 97%, 35% 100%, 28% 95%, 20% 100%, 12% 96%, 5% 100%, 0% 92%, 2% 50%)";
const washiClipRight =
	"polygon(5% 0%, 12% 5%, 20% 0%, 28% 4%, 35% 0%, 42% 6%, 50% 0%, 58% 3%, 65% 0%, 72% 5%, 80% 0%, 88% 4%, 95% 0%, 100% 8%, 98% 50%, 100% 92%, 95% 100%, 88% 95%, 80% 100%, 72% 96%, 65% 100%, 58% 94%, 50% 100%, 42% 97%, 35% 100%, 28% 95%, 20% 100%, 12% 96%, 5% 100%, 0% 92%, 2% 50%, 0% 8%)";

function getShadowDirection(deg: number): TiltDirection {
	if (deg < 0) return "left";
	if (deg > 0) return "right";
	return "none";
}

/**
 * Cadre style Polaroid pour photos.
 * Effet scrapbook/handmade girly.
 *
 * Rotation pilotée par la CSS var `--polaroid-rotate` (set ici, consommée par
 * `.polaroid-hover` dans `app/styles/components.css`) — permet l'addition
 * propre du hover lift (translateY + scale + rotate).
 *
 * @example
 * ```tsx
 * <PolaroidFrame
 *   tiltDegree={-3}
 *   caption="Mon atelier"
 *   washiTape
 *   washiColor="pink"
 *   vintage
 *   aspectRatio="polaroid"
 *   interactive
 *   aria-label="Photo de l'atelier Synclune"
 * >
 *   <Image src="/photo.jpg" alt="..." fill />
 * </PolaroidFrame>
 * ```
 */
export function PolaroidFrame({
	children,
	tilt = "none",
	tiltDegree,
	caption,
	captionColor,
	captionRotate,
	washiTape = false,
	washiColor = "pink",
	washiColorSecondary,
	washiPosition = "top-left",
	vintage = false,
	aspectRatio = "polaroid",
	interactive = false,
	"aria-label": ariaLabel,
	className,
	style: externalStyle,
}: PolaroidFrameProps) {
	const rotateDeg = tiltDegree ?? TILT_DEGREES[tilt];
	const shadowDirection: TiltDirection =
		tiltDegree !== undefined ? getShadowDirection(tiltDegree) : tilt;

	const secondaryWashi = washiColorSecondary ?? WASHI_COMPLEMENT[washiColor];

	return (
		<figure
			// eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- opt-in via `interactive` prop; gated on interactive ↔ tab order discipline
			tabIndex={interactive ? 0 : undefined}
			aria-label={ariaLabel}
			className={cn(
				"polaroid-paper polaroid-hover group/polaroid",
				"relative rounded-sm bg-white p-2.5 pb-8 sm:p-3.5 sm:pb-11",
				className,
			)}
			style={
				{
					boxShadow: tiltShadows[shadowDirection],
					"--polaroid-rotate": `${rotateDeg}deg`,
					...externalStyle,
				} as React.CSSProperties
			}
		>
			{/* Washi tape — top-left */}
			{washiTape && (washiPosition === "top-left" || washiPosition === "both") && (
				<div
					className={cn(
						"absolute -top-2 -left-3 z-10 h-4 w-12 -rotate-12 sm:h-5 sm:w-16",
						washiColors[washiColor],
						"opacity-90 shadow-[inset_0_0_4px_rgba(255,255,255,0.3)]",
					)}
					aria-hidden="true"
					style={{ clipPath: washiClipLeft }}
				/>
			)}

			{/* Washi tape — top-right */}
			{washiTape && (washiPosition === "top-right" || washiPosition === "both") && (
				<div
					className={cn(
						"absolute -top-2 -right-3 z-10 h-4 w-12 rotate-12 sm:h-5 sm:w-16",
						washiColors[secondaryWashi],
						"opacity-90 shadow-[inset_0_0_4px_rgba(255,255,255,0.3)]",
					)}
					aria-hidden="true"
					style={{ clipPath: washiClipRight }}
				/>
			)}

			{/* Photo container with vignette + optional vintage filter */}
			<div
				className={cn(
					"bg-muted relative overflow-hidden",
					aspectClasses[aspectRatio],
					vintage && "contrast-[1.02] saturate-[1.1] sepia-[0.08]",
				)}
			>
				{/* Photo zoom on hover */}
				<div className="motion-safe:can-hover:group-hover/polaroid:scale-[1.06] h-full w-full motion-safe:transition-transform motion-safe:duration-500">
					{children}
				</div>

				{/* Photo vignette — subtle edge darkening */}
				<div
					className="pointer-events-none absolute inset-0"
					style={{ boxShadow: "inset 0 0 30px 5px oklch(0 0 0 / 0.08)" }}
					aria-hidden="true"
				/>
			</div>

			{/* Légende manuscrite */}
			{caption && (
				<figcaption
					className={cn(
						"absolute right-0 bottom-2 left-0 text-center text-sm sm:bottom-3 sm:text-base",
						captionColor ? undefined : "text-muted-foreground",
						"font-cursive",
					)}
					style={{
						...(captionColor ? { color: captionColor } : {}),
						...(captionRotate !== undefined ? { transform: `rotate(${captionRotate}deg)` } : {}),
					}}
				>
					{caption}
				</figcaption>
			)}

			{/* Aging/yellowing effect — warm cream gradient at edges + light reflection */}
			<div
				className="pointer-events-none absolute inset-0 rounded-sm"
				style={{
					background:
						"radial-gradient(ellipse at center, transparent 60%, oklch(0.93 0.04 85 / 0.12) 100%)",
					boxShadow:
						"inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.04), inset 1px 0 0 rgba(255,255,255,0.2), inset -1px 0 0 rgba(255,255,255,0.2)",
				}}
				aria-hidden="true"
			/>
		</figure>
	);
}
