import { petitFormalScript } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import type { ReactNode } from "react";

export type TiltDirection = "left" | "right" | "none";
export type WashiTapeColor = "pink" | "lavender" | "mint" | "peach";
export type WashiTapePosition = "top-left" | "top-right" | "both";

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
	/** Position du washi tape */
	washiPosition?: WashiTapePosition;
	/** Subtle vintage photo filter */
	vintage?: boolean;
	className?: string;
}

const tiltClasses: Record<TiltDirection, string> = {
	left: "-rotate-2",
	right: "rotate-2",
	none: "",
};

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

// Zigzag polygon simulating fibrous washi tape edges
const washiClipLeft = "polygon(2% 8%, 8% 0%, 15% 5%, 22% 0%, 30% 3%, 38% 0%, 45% 6%, 52% 0%, 60% 4%, 68% 0%, 75% 5%, 82% 0%, 90% 3%, 95% 0%, 100% 8%, 98% 50%, 100% 92%, 95% 100%, 88% 95%, 80% 100%, 72% 96%, 65% 100%, 58% 94%, 50% 100%, 42% 97%, 35% 100%, 28% 95%, 20% 100%, 12% 96%, 5% 100%, 0% 92%, 2% 50%)";
const washiClipRight = "polygon(5% 0%, 12% 5%, 20% 0%, 28% 4%, 35% 0%, 42% 6%, 50% 0%, 58% 3%, 65% 0%, 72% 5%, 80% 0%, 88% 4%, 95% 0%, 100% 8%, 98% 50%, 100% 92%, 95% 100%, 88% 95%, 80% 100%, 72% 96%, 65% 100%, 58% 94%, 50% 100%, 42% 97%, 35% 100%, 28% 95%, 20% 100%, 12% 96%, 5% 100%, 0% 92%, 2% 50%, 0% 8%)";

/**
 * Cadre style Polaroid pour photos.
 * Effet scrapbook/handmade girly.
 *
 * @example
 * ```tsx
 * <PolaroidFrame
 *   tilt="left"
 *   tiltDegree={-3}
 *   caption="Mon atelier"
 *   washiTape
 *   washiColor="pink"
 *   vintage
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
	washiPosition = "top-left",
	vintage = false,
	className,
}: PolaroidFrameProps) {
	const hasCustomDegree = tiltDegree !== undefined;
	const rotateDeg = hasCustomDegree ? tiltDegree : { left: -2, right: 2, none: 0 }[tilt];
	const shadowDirection = hasCustomDegree
		? (tiltDegree < 0 ? "left" : tiltDegree > 0 ? "right" : "none")
		: tilt;

	return (
		<figure
			className={cn(
				"polaroid-paper polaroid-hover group/polaroid",
				"relative bg-white dark:bg-zinc-800 p-2.5 sm:p-3.5 pb-8 sm:pb-11 rounded-sm",
				!hasCustomDegree && tiltClasses[tilt],
				className
			)}
			style={{
				boxShadow: tiltShadows[shadowDirection],
				...(hasCustomDegree ? { transform: `rotate(${tiltDegree}deg)` } : {}),
				"--polaroid-rotate": `${rotateDeg}deg`,
			} as React.CSSProperties}
		>
			{/* Washi tape — top-left */}
			{washiTape && (washiPosition === "top-left" || washiPosition === "both") && (
				<div
					className={cn(
						"absolute -top-2 -left-3 w-12 sm:w-16 h-4 sm:h-5 -rotate-12 z-10",
						washiColors[washiColor],
						"opacity-90 shadow-[inset_0_0_4px_rgba(255,255,255,0.3)]"
					)}
					aria-hidden="true"
					style={{ clipPath: washiClipLeft }}
				/>
			)}

			{/* Washi tape — top-right */}
			{washiTape && (washiPosition === "top-right" || washiPosition === "both") && (
				<div
					className={cn(
						"absolute -top-2 -right-3 w-12 sm:w-16 h-4 sm:h-5 rotate-12 z-10",
						washiColors[washiColor === "pink" ? "lavender" : "pink"],
						"opacity-90 shadow-[inset_0_0_4px_rgba(255,255,255,0.3)]"
					)}
					aria-hidden="true"
					style={{ clipPath: washiClipRight }}
				/>
			)}

			{/* Photo container with vignette + optional vintage filter */}
			<div
				className={cn(
					"relative aspect-4/3 overflow-hidden bg-muted",
					vintage && "sepia-[0.08] saturate-[1.1] contrast-[1.02]"
				)}
			>
				{/* Photo zoom on hover */}
				<div className="w-full h-full motion-safe:can-hover:group-hover/polaroid:scale-[1.06] transition-transform duration-500">
					{children}
				</div>

				{/* Photo vignette — subtle edge darkening */}
				<div
					className="absolute inset-0 pointer-events-none"
					style={{ boxShadow: "inset 0 0 30px 5px rgba(0,0,0,0.08)" }}
					aria-hidden="true"
				/>
			</div>

			{/* Légende manuscrite */}
			{caption && (
				<figcaption
					className={cn(
						"absolute bottom-2 sm:bottom-3 left-0 right-0 text-center text-xs sm:text-sm italic",
						captionColor ? undefined : "text-gray-600 dark:text-gray-400",
						petitFormalScript.className
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
				className="absolute inset-0 pointer-events-none rounded-sm"
				style={{
					background: "radial-gradient(ellipse at center, transparent 60%, oklch(0.93 0.04 85 / 0.12) 100%)",
					boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.04), inset 1px 0 0 rgba(255,255,255,0.2), inset -1px 0 0 rgba(255,255,255,0.2)",
				}}
				aria-hidden="true"
			/>
		</figure>
	);
}
