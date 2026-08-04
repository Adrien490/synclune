"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "motion/react";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import {
	GALLERY_MAIN_SIZES,
	MAIN_IMAGE_QUALITY,
} from "@/modules/media/constants/image-config.constants";

interface GalleryHoverZoomProps {
	src: string;
	alt: string;
	blurDataUrl?: string;
	zoomLevel?: 2 | 3;
	/** @public Interrupteur du zoom — dormant : aucun appelant ne le passe aujourd'hui. */
	enabled?: boolean;
	/** @public Dormant : aucun appelant ne le passe aujourd'hui. */
	className?: string;
	/** Marque l'image comme LCP candidate (first image) */
	preload?: boolean;
	/** Image quality (0-100) */
	quality?: number;
	/** @public Image sizes for responsive — dormant : le défaut SSOT suffit aux appelants. */
	sizes?: string;
}

// Même capacité que le variant `can-hover:` de globals.css. Requête sans largeur
// → littéral autorisé (seuls les seuils de largeur passent par le SSOT breakpoints).
const HOVER_CAPABLE_QUERY = "(hover: hover) and (pointer: fine)";

export function GalleryHoverZoom({
	src,
	alt,
	blurDataUrl,
	zoomLevel = 2,
	enabled = true,
	className,
	preload = false,
	quality = MAIN_IMAGE_QUALITY,
	sizes = GALLERY_MAIN_SIZES,
}: GalleryHoverZoomProps) {
	const [isZooming, setIsZooming] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const imageRef = useRef<HTMLImageElement>(null);
	const prefersReduced = useReducedMotion();
	const hoverCapable = useMediaQuery(HOVER_CAPABLE_QUERY);

	const rafRef = useRef<number | null>(null);
	// Dernier pointeur entré sur le conteneur. Voir `handlePointerEnter`.
	const nonMousePointerRef = useRef(false);

	// Sous prefers-reduced-motion, on désactive complètement le zoom (contrat "moins de mouvement").
	// Sans pointeur fin non plus : le consommateur choisit cette branche sur la LARGEUR
	// (iPad ≥ md), or un tap y émule mouseenter sans jamais émettre mouseleave —
	// scale(2) resterait collé derrière la lightbox ouverte par le même tap.
	const interactive = enabled && !prefersReduced && hoverCapable;

	const applyOrigin = (clientX: number, clientY: number) => {
		if (!containerRef.current || !imageRef.current) return;
		// Rect relu à chaque application : un rect mémorisé au mouseenter se périme
		// dès que la page scrolle sous le curseur (origine du zoom décalée).
		const rect = containerRef.current.getBoundingClientRect();
		const x = ((clientX - rect.left) / rect.width) * 100;
		const y = ((clientY - rect.top) / rect.height) * 100;
		imageRef.current.style.transformOrigin = `${x}% ${y}%`;
	};

	// RAF-only throttle (plus efficace que Date.now + RAF)
	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!imageRef.current || !isZooming) return;

		// Skip si RAF déjà en cours
		if (rafRef.current) return;

		rafRef.current = requestAnimationFrame(() => {
			rafRef.current = null;
			applyOrigin(e.clientX, e.clientY);
		});
	};

	// La capacité de survol se vérifie aussi par ÉVÉNEMENT, pas seulement par appareil.
	// `(hover: hover) and (pointer: fine)` décrit le pointeur PRIMAIRE : sur un portable
	// tactile (primaire = trackpad) elle répond `true`, si bien qu'un doigt sur l'écran y
	// émulait `mouseenter` sans jamais émettre `mouseleave` — `scale()` restait collé
	// derrière la lightbox ouverte par le même geste. C'est le bug iPad du 2026-08-03, sur
	// la classe d'appareils que le gating par media query ne couvre pas.
	// `pointerenter` précède toujours le `mouseenter` de compatibilité, pour les deux
	// types d'entrée : le drapeau est donc à jour à chaque survol, et il se corrige tout
	// seul quand l'utilisatrice repasse à la souris.
	const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
		nonMousePointerRef.current = e.pointerType !== "mouse";
		if (nonMousePointerRef.current) setIsZooming(false);
	};

	const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
		if (nonMousePointerRef.current) return;
		// Recale l'origine sur le point d'entrée du curseur AVANT d'activer le scale,
		// sinon le zoom démarre sur la dernière origine du survol précédent (saut visuel).
		applyOrigin(e.clientX, e.clientY);
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
				"relative h-full w-full overflow-hidden",
				// Cohérent avec l'action au clic (ouverture plein écran) — cf. wrapper <button> du slide
				"cursor-zoom-in",
				className,
			)}
			onPointerEnter={handlePointerEnter}
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
