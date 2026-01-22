import { dancingScript } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import type { ReactNode } from "react";

export type TiltDirection = "left" | "right" | "none";
export type WashiTapeColor = "pink" | "lavender" | "mint" | "peach";
export type WashiTapePosition = "top-left" | "top-right" | "both";

interface PolaroidFrameProps {
	children: ReactNode;
	/** Rotation légère de la photo */
	tilt?: TiltDirection;
	/** Légende manuscrite sous la photo */
	caption?: string;
	/** Afficher du washi tape décoratif */
	washiTape?: boolean;
	/** Couleur du washi tape */
	washiColor?: WashiTapeColor;
	/** Position du washi tape */
	washiPosition?: WashiTapePosition;
	className?: string;
}

const tiltClasses: Record<TiltDirection, string> = {
	left: "-rotate-2",
	right: "rotate-2",
	none: "",
};

const washiColors: Record<WashiTapeColor, string> = {
	pink: "bg-linear-to-r from-pink-200/80 to-pink-300/80",
	lavender: "bg-linear-to-r from-purple-200/80 to-purple-300/80",
	mint: "bg-linear-to-r from-green-200/80 to-green-300/80",
	peach: "bg-linear-to-r from-orange-200/80 to-orange-300/80",
};

/**
 * Cadre style Polaroid pour photos.
 * Effet scrapbook/handmade girly.
 *
 * @example
 * ```tsx
 * <PolaroidFrame
 *   tilt="left"
 *   caption="Mon atelier"
 *   washiTape
 *   washiColor="pink"
 * >
 *   <Image src="/photo.jpg" alt="..." fill />
 * </PolaroidFrame>
 * ```
 */
export function PolaroidFrame({
	children,
	tilt = "none",
	caption,
	washiTape = false,
	washiColor = "pink",
	washiPosition = "top-left",
	className,
}: PolaroidFrameProps) {
	return (
		<figure
			className={cn(
				"relative bg-white p-2 sm:p-3 pb-10 sm:pb-12 rounded-sm shadow-lg",
				"transition-transform duration-300 hover:scale-[1.02]",
				tiltClasses[tilt],
				className
			)}
		>
			{/* Washi tape décoratif */}
			{washiTape && (washiPosition === "top-left" || washiPosition === "both") && (
				<div
					className={cn(
						"absolute -top-2 -left-3 w-12 sm:w-16 h-4 sm:h-5 -rotate-12 z-10",
						washiColors[washiColor],
						"opacity-90 shadow-sm"
					)}
					aria-hidden="true"
					style={{
						clipPath: "polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)",
					}}
				/>
			)}

			{washiTape && (washiPosition === "top-right" || washiPosition === "both") && (
				<div
					className={cn(
						"absolute -top-2 -right-3 w-12 sm:w-16 h-4 sm:h-5 rotate-12 z-10",
						washiColors[washiColor === "pink" ? "lavender" : "pink"],
						"opacity-90 shadow-sm"
					)}
					aria-hidden="true"
					style={{
						clipPath: "polygon(0% 0%, 95% 0%, 100% 100%, 5% 100%)",
					}}
				/>
			)}

			{/* Contenu de l'image */}
			<div className="relative aspect-4/3 overflow-hidden bg-muted">
				{children}
			</div>

			{/* Légende manuscrite */}
			{caption && (
				<figcaption
					className={cn(
						"absolute bottom-2 sm:bottom-3 left-0 right-0 text-center text-sm sm:text-base text-gray-600 italic",
						dancingScript.className
					)}
				>
					{caption}
				</figcaption>
			)}

			{/* Effet de bord légèrement usé */}
			<div
				className="absolute inset-0 pointer-events-none rounded-sm"
				style={{
					boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)",
				}}
				aria-hidden="true"
			/>
		</figure>
	);
}
