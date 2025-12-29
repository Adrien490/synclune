"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "@/shared/hooks";

interface GalleryHoverZoomProps {
	src: string;
	alt: string;
	blurDataUrl?: string;
	zoomLevel?: 2 | 3;
	enabled?: boolean;
	className?: string;
	/** Marque l'image comme LCP candidate (first image) */
	priority?: boolean;
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
	priority = false,
	quality = 85,
	sizes = "(min-width: 1024px) 45vw, 100vw",
}: GalleryHoverZoomProps) {
	const [isZooming, setIsZooming] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const imageRef = useRef<HTMLImageElement>(null);
	const prefersReduced = useReducedMotion();

	const rectRef = useRef<DOMRect | null>(null);
	const rafRef = useRef<number>(0);
	const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Debounced resize listener pour éviter le jank
	useEffect(() => {
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
	}, []);

	// RAF-only throttle (plus efficace que Date.now + RAF)
	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!imageRef.current || !rectRef.current || !isZooming) return;

		// Skip si RAF déjà en cours
		if (rafRef.current) return;

		rafRef.current = requestAnimationFrame(() => {
			rafRef.current = 0;
			if (!rectRef.current || !imageRef.current) return;

			const x = ((e.clientX - rectRef.current.left) / rectRef.current.width) * 100;
			const y = ((e.clientY - rectRef.current.top) / rectRef.current.height) * 100;

			imageRef.current.style.transformOrigin = `${x}% ${y}%`;
		});
	};

	const handleMouseEnter = () => {
		setIsZooming(true);
		if (containerRef.current) {
			rectRef.current = containerRef.current.getBoundingClientRect();
		}
	};

	const handleMouseLeave = () => {
		setIsZooming(false);
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = 0;
		}
	};

	// Cleanup RAF au unmount
	useEffect(() => {
		return () => {
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
			}
		};
	}, []);

	const transitionClass = prefersReduced ? "" : "transition-transform duration-300 ease-out";
	const opacityTransition = prefersReduced ? "" : "transition-opacity duration-300";

	if (!enabled) {
		return (
			<div className={cn("relative w-full h-full", className)}>
				<Image
					src={src}
					alt={alt}
					fill
					className="object-cover"
					priority={priority}
					loading={priority ? "eager" : "lazy"}
					fetchPriority={priority ? "high" : "auto"}
					quality={quality}
					sizes={sizes}
					placeholder={blurDataUrl ? "blur" : "empty"}
					blurDataURL={blurDataUrl}
				/>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className={cn(
				"relative w-full h-full overflow-hidden group/zoom",
				"cursor-crosshair",
				className
			)}
			onMouseMove={handleMouseMove}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<Image
				ref={imageRef}
				src={src}
				alt={`${alt} (zoom disponible au survol)`}
				fill
				className={cn("object-cover", transitionClass)}
				style={{
					transform: isZooming ? `scale(${zoomLevel})` : "scale(1)",
					transformOrigin: "center center",
				}}
				priority={priority}
				loading={priority ? "eager" : "lazy"}
				fetchPriority={priority ? "high" : "auto"}
				quality={quality}
				sizes={sizes}
				placeholder={blurDataUrl ? "blur" : "empty"}
				blurDataURL={blurDataUrl}
			/>

			<div
				className={cn(
					"absolute bottom-3 right-3 z-10",
					"bg-black/60 backdrop-blur-sm text-white",
					"px-2.5 py-1.5 rounded-full text-xs font-medium",
					"opacity-0 group-hover/zoom:opacity-100",
					opacityTransition,
					"pointer-events-none select-none"
				)}
				aria-hidden="true"
			>
				Survolez pour zoomer
			</div>
		</div>
	);
}
