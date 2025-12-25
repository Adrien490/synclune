"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/shared/utils/cn";

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
 * - Performance optimisée :
 *   - Une seule image CSS (pas de double téléchargement)
 *   - Throttle mousemove (60 FPS max)
 *   - Rect mémorisé (pas de getBoundingClientRect à chaque move)
 *   - CSS transforms uniquement (pas de re-render React)
 * - Desktop uniquement (masqué sur mobile)
 * - Accessible (role, aria-label)
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
	const containerRef = useRef<HTMLDivElement>(null);
	const zoomedLayerRef = useRef<HTMLDivElement>(null);

	// Mémoriser le rect pour éviter getBoundingClientRect à chaque mousemove
	const rectRef = useRef<DOMRect | null>(null);

	// Throttle pour mousemove (60 FPS = 16ms)
	const lastUpdateRef = useRef<number>(0);
	const rafRef = useRef<number>(0);

	// Mettre à jour le rect au mount et au resize
	useEffect(() => {
		const updateRect = () => {
			if (containerRef.current) {
				rectRef.current = containerRef.current.getBoundingClientRect();
			}
		};

		updateRect();
		window.addEventListener("resize", updateRect);
		return () => window.removeEventListener("resize", updateRect);
	}, []);

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!zoomedLayerRef.current || !rectRef.current) return;

		// Throttle avec requestAnimationFrame (60 FPS max)
		const now = Date.now();
		if (now - lastUpdateRef.current < 16) return; // 16ms = 60 FPS
		lastUpdateRef.current = now;

		// Annuler le RAF précédent si existe
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current);
		}

		// Calculer la position relative avec le rect mémorisé
		rafRef.current = requestAnimationFrame(() => {
			if (!rectRef.current || !zoomedLayerRef.current) return;

			const x = ((e.clientX - rectRef.current.left) / rectRef.current.width) * 100;
			const y = ((e.clientY - rectRef.current.top) / rectRef.current.height) * 100;

			// Utiliser CSS custom properties pour éviter re-render
			zoomedLayerRef.current.style.setProperty("--zoom-x", `${x}%`);
			zoomedLayerRef.current.style.setProperty("--zoom-y", `${y}%`);
		});
	};

	const handleMouseEnter = () => {
		setIsZooming(true);
		// Mettre à jour le rect au hover (cas où resize pendant que pas hover)
		if (containerRef.current) {
			rectRef.current = containerRef.current.getBoundingClientRect();
		}
	};

	const handleMouseLeave = () => {
		setIsZooming(false);
		// Annuler RAF en cours si existe
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current);
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

	if (!enabled) {
		return (
			<div
				className={cn("relative w-full h-full", className)}
				style={{
					backgroundImage: `url(${src})`,
					backgroundSize: "cover",
					backgroundPosition: "center",
				}}
				role="img"
				aria-label={alt}
			>
				{blurDataUrl && (
					<div
						className="absolute inset-0 -z-10"
						style={{
							backgroundImage: `url(${blurDataUrl})`,
							backgroundSize: "cover",
							filter: "blur(20px)",
						}}
						aria-hidden="true"
					/>
				)}
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
			{/* Blur placeholder (chargé en premier, très léger) */}
			{blurDataUrl && (
				<div
					className="absolute inset-0 -z-10"
					style={{
						backgroundImage: `url(${blurDataUrl})`,
						backgroundSize: "cover",
						filter: "blur(20px)",
					}}
					aria-hidden="true"
				/>
			)}

			{/* Image normale (visible quand pas de hover) */}
			<div
				className={cn(
					"absolute inset-0 transition-opacity duration-300",
					isZooming ? "opacity-0" : "opacity-100"
				)}
				style={{
					backgroundImage: `url(${src})`,
					backgroundSize: "cover",
					backgroundPosition: "center",
				}}
				aria-hidden={isZooming}
			/>

			{/* Image zoomée (visible au hover) - Utilise CSS variables pour perf */}
			<div
				ref={zoomedLayerRef}
				className={cn(
					"absolute inset-0 transition-opacity duration-300 pointer-events-none",
					isZooming ? "opacity-100" : "opacity-0"
				)}
				style={{
					backgroundImage: `url(${src})`,
					backgroundPosition: "var(--zoom-x, 50%) var(--zoom-y, 50%)",
					backgroundSize: `${zoomLevel * 100}%`,
					backgroundRepeat: "no-repeat",
					// Initialiser les CSS variables
					["--zoom-x" as string]: "50%",
					["--zoom-y" as string]: "50%",
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
