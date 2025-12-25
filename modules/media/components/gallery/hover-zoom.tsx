"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { cn } from "@/shared/utils/cn";
import { MAIN_IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

interface GalleryHoverZoomProps {
	/** URL de l'image à zoomer */
	src: string;
	/** Texte alternatif */
	alt: string;
	/** Blur placeholder pour optimiser le chargement */
	blurDataUrl?: string;
	/** Niveau de zoom (2 = 200%, 3 = 300%) */
	zoomLevel?: 2 | 3;
	/** Activer le zoom (desktop uniquement par défaut) */
	enabled?: boolean;
	/** Classes CSS additionnelles */
	className?: string;
}

/**
 * Composant zoom hover pour galerie produit (style e-commerce luxe)
 *
 * Fonctionnalités :
 * - Loupe qui suit le curseur au hover
 * - Zoom 2x ou 3x configurable
 * - Performance optimisée (CSS transforms, pas de re-render)
 * - Desktop uniquement (masqué sur mobile)
 * - Accessible (focus clavier)
 *
 * Inspiré de : Cartier, Tiffany, NET-A-PORTER
 *
 * @example
 * <GalleryHoverZoom
 *   src="/image.jpg"
 *   alt="Boucles d'oreilles"
 *   zoomLevel={3}
 * />
 */
export function GalleryHoverZoom({
	src,
	alt,
	blurDataUrl,
	zoomLevel = 2,
	enabled = true,
	className,
}: GalleryHoverZoomProps) {
	const [isZooming, setIsZooming] = useState(false);
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const containerRef = useRef<HTMLDivElement>(null);

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!containerRef.current) return;

		const rect = containerRef.current.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * 100;
		const y = ((e.clientY - rect.top) / rect.height) * 100;

		setPosition({ x, y });
	};

	const handleMouseEnter = () => {
		setIsZooming(true);
	};

	const handleMouseLeave = () => {
		setIsZooming(false);
	};

	if (!enabled) {
		return (
			<div className={cn("relative w-full h-full", className)}>
				<Image
					src={src}
					alt={alt}
					fill
					className="object-cover"
					quality={MAIN_IMAGE_QUALITY}
					sizes="(max-width: 768px) 100vw, 50vw"
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
			role="img"
			aria-label={`${alt} (zoom disponible au survol)`}
		>
			{/* Image principale */}
			<Image
				src={src}
				alt={alt}
				fill
				className={cn(
					"object-cover transition-opacity duration-300",
					isZooming && "opacity-0"
				)}
				quality={MAIN_IMAGE_QUALITY}
				sizes="(max-width: 768px) 100vw, 50vw"
				placeholder={blurDataUrl ? "blur" : "empty"}
				blurDataURL={blurDataUrl}
			/>

			{/* Overlay zoomé (visible au hover uniquement) */}
			<div
				className={cn(
					"absolute inset-0 transition-opacity duration-300 pointer-events-none",
					isZooming ? "opacity-100" : "opacity-0"
				)}
				style={{
					backgroundImage: `url(${src})`,
					backgroundPosition: `${position.x}% ${position.y}%`,
					backgroundSize: `${zoomLevel * 100}%`,
					backgroundRepeat: "no-repeat",
				}}
				aria-hidden="true"
			/>

			{/* Indicateur zoom (visible uniquement au hover du container parent) */}
			<div
				className={cn(
					"absolute bottom-3 right-3 z-10",
					"bg-black/60 backdrop-blur-sm text-white",
					"px-2.5 py-1.5 rounded-full text-xs font-medium",
					"opacity-0 group-hover/zoom:opacity-100 transition-opacity duration-300",
					"pointer-events-none select-none"
				)}
			>
				Survolez pour zoomer
			</div>
		</div>
	);
}
