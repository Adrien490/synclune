"use client";

import {
	motion,
	useScroll,
	useTransform,
	useReducedMotion,
	useInView,
} from "framer-motion";
import Image from "next/image";
import { useRef, useSyncExternalStore } from "react";

interface ParallaxImageProps {
	src: string;
	alt: string;
	blurDataURL?: string;
	className?: string;
	/** Force de l'effet parallax en pourcentage (défaut: 5) */
	intensity?: number;
	/** Attribut sizes pour images responsives */
	sizes?: string;
	/** Qualité de compression (défaut: 85) */
	quality?: number;
	/** Preload prioritaire pour above-fold */
	priority?: boolean;
}

// Hydration safety pattern (évite mismatch server/client)
const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Image avec effet parallax subtil au scroll
 *
 * Respecte prefers-reduced-motion et assure l'hydration safety.
 * L'animation ne s'active que lorsque l'élément est visible (lazy).
 *
 * @param src - URL de l'image
 * @param alt - Texte alternatif pour l'accessibilité
 * @param blurDataURL - Placeholder blur en base64
 * @param className - Classes CSS pour l'image
 * @param intensity - Force de l'effet (défaut: 5%)
 * @param sizes - Attribut sizes responsive
 * @param quality - Qualité de compression (défaut: 85)
 * @param priority - Preload prioritaire
 *
 * @example
 * ```tsx
 * <ParallaxImage
 *   src={IMAGES.ATELIER}
 *   alt="Atelier de création Synclune"
 *   blurDataURL={IMAGES.ATELIER_BLUR}
 *   intensity={8}
 *   sizes="(max-width: 768px) 100vw, 50vw"
 * />
 * ```
 */
export function ParallaxImage({
	src,
	alt,
	blurDataURL,
	className,
	intensity = 5,
	sizes = "(max-width: 1024px) 100vw, 50vw",
	quality = 85,
	priority = false,
}: ParallaxImageProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const shouldReduceMotion = useReducedMotion();

	// Lazy animation : n'active le parallax que si visible
	const isInView = useInView(containerRef, { once: false, margin: "-10%" });

	// Hydration safety : évite les mismatches useReducedMotion server/client
	const isMounted = useSyncExternalStore(
		subscribeNoop,
		getClientSnapshot,
		getServerSnapshot
	);

	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start end", "end start"],
	});

	// Effet parallax : translation Y basée sur le scroll
	const y = useTransform(
		scrollYProgress,
		[0, 1],
		[`-${intensity}%`, `${intensity}%`]
	);

	// Image commune (évite la duplication de code)
	const imageElement = (
		<Image
			src={src}
			alt={alt}
			fill
			className={className}
			loading={priority ? undefined : "lazy"}
			priority={priority}
			quality={quality}
			sizes={sizes}
			placeholder={blurDataURL ? "blur" : undefined}
			blurDataURL={blurDataURL}
		/>
	);

	// SSR fallback ou reduced motion : rendu statique sans animation
	if (!isMounted || shouldReduceMotion) {
		return (
			<div ref={containerRef} className="relative h-full w-full overflow-hidden">
				{imageElement}
			</div>
		);
	}

	return (
		<div ref={containerRef} className="relative h-full w-full overflow-hidden">
			<motion.div
				className="relative w-full"
				style={{
					// Container plus grand pour éviter le clipping lors du parallax
					height: `${100 + intensity * 2}%`,
					// Animation uniquement si visible (performance)
					y: isInView ? y : 0,
				}}
			>
				{imageElement}
			</motion.div>
		</div>
	);
}
