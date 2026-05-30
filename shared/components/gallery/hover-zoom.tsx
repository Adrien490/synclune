"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "motion/react";
import { GALLERY_MAIN_SIZES } from "@/modules/media/constants/image-config.constants";

interface GalleryHoverZoomProps {
	src: string;
	alt: string;
	blurDataUrl?: string;
	zoomLevel?: 2 | 3;
	enabled?: boolean;
	className?: string;
	/** Marque l'image comme LCP candidate (first image) */
	preload?: boolean;
	/** Image quality (0-100) */
	quality?: number;
	/** Image sizes for responsive */
	sizes?: string;
}

export function GalleryHoverZoom({
	src,
	alt,
	blurDataUrl,
	zoomLevel = 2,
	enabled = true,
	className,
	preload = false,
	quality = 85,
	sizes = GALLERY_MAIN_SIZES,
}: GalleryHoverZoomProps) {
	const [isZooming, setIsZooming] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const imageRef = useRef<HTMLImageElement>(null);
	const prefersReduced = useReducedMotion();

	const rectRef = useRef<DOMRect | null>(null);
	const rafRef = useRef<number | null>(null);
	const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Sous prefers-reduced-motion, on désactive complètement le zoom (contrat "moins de mouvement").
	const interactive = enabled && !prefersReduced;

	// Debounced resize listener pour éviter le jank (seulement si interactif)
	useEffect(() => {
		if (!interactive) return;

		const updateRect = () => {
			if (containerRef.current) {
				rectRef.current = containerRef.current.getBoundingClientRect();
			}
		};

		const debouncedUpdateRect = () => {
			if (resizeTimeoutRef.current) {
				clearTimeout(resizeTimeoutRef.current);
			}
			resizeTimeoutRef.current = setTimeout(updateRect, 150);
		};

		updateRect();
		window.addEventListener("resize", debouncedUpdateRect);

		return () => {
			window.removeEventListener("resize", debouncedUpdateRect);
			if (resizeTimeoutRef.current) {
				clearTimeout(resizeTimeoutRef.current);
			}
		};
	}, [interactive]);

	// RAF-only throttle (plus efficace que Date.now + RAF)
	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!imageRef.current || !rectRef.current || !isZooming) return;

		// Skip si RAF déjà en cours
		if (rafRef.current) return;

		rafRef.current = requestAnimationFrame(() => {
			rafRef.current = null;
			if (!rectRef.current || !imageRef.current) return;

			const x = ((e.clientX - rectRef.current.left) / rectRef.current.width) * 100;
			const y = ((e.clientY - rectRef.current.top) / rectRef.current.height) * 100;

			imageRef.current.style.transformOrigin = `${x}% ${y}%`;
		});
	};

	const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
		if (containerRef.current) {
			rectRef.current = containerRef.current.getBoundingClientRect();
		}
		// Recale l'origine sur le point d'entrée du curseur AVANT d'activer le scale,
		// sinon le zoom démarre sur la dernière origine du survol précédent (saut visuel).
		if (imageRef.current && rectRef.current) {
			const x = ((e.clientX - rectRef.current.left) / rectRef.current.width) * 100;
			const y = ((e.clientY - rectRef.current.top) / rectRef.current.height) * 100;
			imageRef.current.style.transformOrigin = `${x}% ${y}%`;
		}
		setIsZooming(true);
	};

	const handleMouseLeave = () => {
		setIsZooming(false);
		if (rafRef.current !== null) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		}
	};

	// Cleanup RAF au unmount
	useEffect(() => {
		return () => {
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
			}
		};
	}, []);

	const transitionClass = "transition-transform duration-300 ease-out";

	if (!interactive) {
		return (
			<div className={cn("relative h-full w-full", className)}>
				<Image
					src={src}
					alt={alt}
					fill
					className="object-cover"
					preload={preload}
					fetchPriority={preload ? "high" : undefined}
					quality={quality}
					sizes={sizes}
					placeholder={blurDataUrl ? "blur" : "empty"}
					blurDataURL={blurDataUrl}
				/>
			</div>
		);
	}

	return (
		// eslint-disable-next-line jsx-a11y/no-static-element-interactions -- hover zoom container for desktop mouse interaction
		<div
			ref={containerRef}
			className={cn(
				"group/zoom relative h-full w-full overflow-hidden",
				// Cohérent avec l'action au clic (ouverture plein écran) — cf. wrapper <button> du slide
				"cursor-zoom-in",
				className,
			)}
			onMouseMove={handleMouseMove}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<Image
				ref={imageRef}
				src={src}
				alt={alt}
				fill
				className={cn("object-cover", transitionClass)}
				style={{
					transform: isZooming ? `scale(${zoomLevel})` : "scale(1)",
					transformOrigin: "center center",
				}}
				preload={preload}
				fetchPriority={preload ? "high" : undefined}
				quality={quality}
				sizes={sizes}
				placeholder={blurDataUrl ? "blur" : "empty"}
				blurDataURL={blurDataUrl}
			/>
		</div>
	);
}
