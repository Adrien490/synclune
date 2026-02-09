"use client";

import { useRef } from "react";
import Image from "next/image";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion, usePinchZoom } from "@/shared/hooks";
import { MAIN_IMAGE_QUALITY, GALLERY_MAIN_SIZES } from "@/modules/media/constants/image-config.constants";
import { PINCH_ZOOM_CONFIG } from "@/modules/media/constants/gallery.constants";

interface GalleryPinchZoomProps {
	src: string;
	alt: string;
	blurDataUrl?: string;
	isActive: boolean;
	onTap?: () => void;
	preload?: boolean;
}

/**
 * Mobile component with native pinch-to-zoom support
 *
 * Features:
 * - Pinch to zoom (1x → 3x)
 * - Double-tap to toggle 2x zoom / reset
 * - Pan when zoomed
 * - Single tap opens lightbox
 *
 * Accessibility:
 * - Full keyboard support (+/-/arrows/Escape)
 * - Dynamic ARIA labels
 * - Visible focus
 * - Screen reader announcements
 * - Respects prefers-reduced-motion
 */
export function GalleryPinchZoom({
	src,
	alt,
	blurDataUrl,
	isActive,
	onTap,
	preload = false,
}: GalleryPinchZoomProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const prefersReduced = useReducedMotion();

	const {
		scale,
		position,
		isZoomed,
		isInteracting,
		handleKeyDown,
	} = usePinchZoom({
		containerRef,
		isActive,
		onTap,
		config: PINCH_ZOOM_CONFIG,
	});

	const transitionClass = prefersReduced ? "" : "transition-transform duration-200 ease-out";

	// Dynamic ARIA label based on state
	const ariaLabel = isZoomed
		? `${alt}. Zoom ${Math.round(scale * 100)}%. Utilisez les flèches pour déplacer, Échap pour réinitialiser.`
		: `${alt}. Double-tapez ou appuyez sur + pour zoomer. Entrée pour ouvrir en plein écran.`;

	return (
		<div
			ref={containerRef}
			role="img"
			aria-label={ariaLabel}
			aria-roledescription="Image zoomable"
			tabIndex={0}
			onKeyDown={handleKeyDown}
			className={cn(
				"group/pinch relative w-full h-full overflow-hidden",
				"outline-none",
				"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
				"active:scale-[0.99] transition-transform", // Tactile feedback
				isZoomed ? "touch-none cursor-grab" : "touch-manipulation cursor-zoom-in"
			)}
			style={{ touchAction: isZoomed ? "none" : "manipulation" }}
		>
			{/* Transformable image container */}
			<div
				className={cn(
					"relative w-full h-full",
					transitionClass // Always applied for smooth double-tap
				)}
				style={{
					transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
					transformOrigin: "center center",
					willChange: isInteracting ? "transform" : "auto",
				}}
			>
				<Image
					src={src}
					alt="" // Empty alt because managed by the parent container
					fill
					className="object-cover pointer-events-none select-none"
					preload={preload}
					loading={preload ? undefined : "lazy"}
					quality={MAIN_IMAGE_QUALITY}
					sizes={GALLERY_MAIN_SIZES}
					placeholder={blurDataUrl ? "blur" : "empty"}
					blurDataURL={blurDataUrl}
					draggable={false}
				/>
			</div>

			{/* Visual zoom indicator */}
			{isZoomed && (
				<div
					className={cn(
						"absolute top-3 right-3 z-10",
						"bg-black/60 backdrop-blur-sm text-white",
						"px-2.5 py-1 rounded-full text-xs font-medium tabular-nums",
						"pointer-events-none select-none",
						!prefersReduced && "animate-in fade-in duration-200"
					)}
					aria-hidden="true"
				>
					{Math.round(scale * 100)}%
				</div>
			)}

			{/* Screen reader announcement (WCAG 4.1.3) */}
			{isZoomed && (
				<div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
					Zoom {Math.round(scale * 100)} pourcent
				</div>
			)}

			{/* Focus instructions (mobile/desktop) */}
			<div
				className={cn(
					"absolute bottom-3 left-1/2 -translate-x-1/2 z-10",
					"bg-black/60 backdrop-blur-sm text-white",
					"px-3 py-1.5 rounded-full text-xs font-medium",
					"pointer-events-none select-none",
					"opacity-0 group-focus-visible/pinch:opacity-100",
					"hidden sm:block", // Visible only on keyboard focus (desktop)
					!prefersReduced && "transition-opacity duration-200"
				)}
				aria-hidden="true"
			>
				+/- zoomer • Flèches déplacer • Échap réinitialiser
			</div>
		</div>
	);
}
