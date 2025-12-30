"use client";

import {
	motion,
	useScroll,
	useTransform,
	useReducedMotion,
	useInView,
} from "motion/react";
import Image from "next/image";
import type { RefObject } from "react";
import { useRef, useSyncExternalStore } from "react";
import { cn } from "@/shared/utils/cn";
import { useIsTouchDevice } from "@/shared/hooks";

interface ParallaxImageProps {
	src: string;
	alt: string;
	blurDataURL?: string;
	className?: string;
	/** Classes CSS sur le container externe */
	containerClassName?: string;
	/** Force de l'effet parallax en pourcentage (defaut: 5, max: 15) */
	intensity?: number;
	/** Attribut sizes pour images responsives */
	sizes?: string;
	/** Qualite de compression (defaut: 85) */
	quality?: number;
	/** Preload prioritaire pour above-fold */
	priority?: boolean;
	/** Image purement decorative (aria-hidden, alt vide) */
	decorative?: boolean;
	/** Desactive le parallax sur appareils tactiles (defaut: true pour meilleure UX mobile) */
	disableOnTouch?: boolean;
}

interface ParallaxInnerProps {
	containerRef: RefObject<HTMLDivElement | null>;
	safeIntensity: number;
	imageElement: React.ReactNode;
}

// Hydration safety pattern (evite mismatch server/client)
const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Composant interne qui gere l'animation parallax
 * Isole les hooks scroll pour eviter les listeners inutiles quand desactive
 */
function ParallaxInner({
	containerRef,
	safeIntensity,
	imageElement,
}: ParallaxInnerProps) {
	// Lazy animation : n'active le parallax que si visible
	// Margin fixe en pixels pour comportement consistant mobile/desktop
	const isInView = useInView(containerRef, {
		once: false,
		margin: "0px 0px -100px 0px",
	});

	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start end", "end start"],
	});

	// Effet parallax : translation Y basee sur le scroll
	const y = useTransform(
		scrollYProgress,
		[0, 1],
		[`-${safeIntensity}%`, `${safeIntensity}%`]
	);

	return (
		<motion.div
			className="absolute inset-x-0 w-full"
			style={{
				// Container plus grand pour eviter le clipping lors du parallax
				height: `${100 + safeIntensity * 2}%`,
				// Centrage vertical pour eviter le clipping aux extremes
				top: `-${safeIntensity}%`,
				// Animation uniquement si visible (performance)
				y: isInView ? y : 0,
				// GPU hint uniquement quand visible (evite surconsommation memoire)
				willChange: isInView ? "transform" : "auto",
			}}
		>
			{imageElement}
		</motion.div>
	);
}

/**
 * Image avec effet parallax subtil au scroll
 *
 * Respecte prefers-reduced-motion et assure l'hydration safety.
 * L'animation ne s'active que lorsque l'element est visible (lazy).
 *
 * @param src - URL de l'image
 * @param alt - Texte alternatif pour l'accessibilite
 * @param blurDataURL - Placeholder blur en base64
 * @param className - Classes CSS pour l'image
 * @param containerClassName - Classes CSS pour le container externe
 * @param intensity - Force de l'effet (defaut: 5%, max: 15%)
 * @param sizes - Attribut sizes responsive
 * @param quality - Qualite de compression (defaut: 85)
 * @param priority - Preload prioritaire
 * @param decorative - Image purement decorative (aria-hidden)
 * @param disableOnTouch - Desactive le parallax sur appareils tactiles (defaut: true)
 *
 * @example
 * ```tsx
 * <ParallaxImage
 *   src={IMAGES.ATELIER}
 *   alt="Atelier de creation Synclune"
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
	containerClassName,
	intensity = 5,
	sizes = "(max-width: 1024px) 100vw, 50vw",
	quality = 85,
	priority = false,
	decorative = false,
	disableOnTouch = true,
}: ParallaxImageProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const shouldReduceMotion = useReducedMotion();
	const isTouchDevice = useIsTouchDevice();

	// Hydration safety : evite les mismatches useReducedMotion server/client
	const isMounted = useSyncExternalStore(
		subscribeNoop,
		getClientSnapshot,
		getServerSnapshot
	);

	// Limite l'intensite pour eviter overflow (max 15%)
	const safeIntensity = Math.min(intensity, 15);

	// Image commune (evite la duplication de code)
	const imageElement = (
		<Image
			src={src}
			alt={decorative ? "" : alt}
			aria-hidden={decorative || undefined}
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

	// SSR, reduced motion, ou appareil tactile avec option activee : rendu statique
	// Les hooks scroll sont isoles dans ParallaxInner pour eviter les listeners inutiles
	const shouldDisableParallax =
		!isMounted || shouldReduceMotion || (disableOnTouch && isTouchDevice);

	if (shouldDisableParallax) {
		return (
			<div
				ref={containerRef}
				className={cn(
					"relative h-full w-full overflow-hidden",
					containerClassName
				)}
			>
				{imageElement}
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className={cn(
				"relative h-full w-full overflow-hidden",
				containerClassName
			)}
		>
			<ParallaxInner
				containerRef={containerRef}
				safeIntensity={safeIntensity}
				imageElement={imageElement}
			/>
		</div>
	);
}
