"use client";

/**
 * Image Next.js avec shimmer fallback automatique
 *
 * Quand une image n'a pas de blurDataUrl, un effet shimmer
 * est affiché pendant le chargement pour une meilleure UX.
 *
 * @module shared/components/image-with-shimmer
 */

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/shared/utils/cn";

interface ImageWithShimmerProps extends Omit<ImageProps, "placeholder" | "onLoad"> {
	/** Classe CSS pour le conteneur */
	containerClassName?: string;
	/** Data URL du blur placeholder (ThumbHash recommandé) */
	blurDataUrl?: string | null;
	/** Variante du shimmer */
	shimmerVariant?: "default" | "girly";
}

/**
 * Image avec shimmer fallback automatique
 *
 * @description
 * - Si blurDataUrl est fourni: utilise le blur placeholder natif
 * - Sinon: affiche un shimmer pendant le chargement
 *
 * @example
 * ```tsx
 * <ImageWithShimmer
 *   src={media.url}
 *   alt={media.alt}
 *   blurDataUrl={media.blurDataUrl}
 *   fill
 *   className="object-cover"
 * />
 * ```
 */
export function ImageWithShimmer({
	blurDataUrl,
	containerClassName,
	shimmerVariant = "default",
	className,
	alt,
	...props
}: ImageWithShimmerProps) {
	const [isLoaded, setIsLoaded] = useState(false);
	const hasBlur = Boolean(blurDataUrl);

	// Si on a un blur, on utilise le comportement natif
	if (hasBlur) {
		return (
			<Image
				{...props}
				alt={alt}
				className={className}
				placeholder="blur"
				blurDataURL={blurDataUrl!}
			/>
		);
	}

	// Sinon, on ajoute un shimmer pendant le chargement
	const shimmerClass = shimmerVariant === "girly" ? "animate-shimmer-girly" : "animate-shimmer";

	return (
		<div className={cn("relative overflow-hidden", containerClassName)}>
			{/* Shimmer overlay - visible tant que l'image n'est pas chargée */}
			{!isLoaded && (
				<div
					className={cn(
						"absolute inset-0 z-10",
						shimmerClass
					)}
					aria-hidden="true"
				/>
			)}

			<Image
				{...props}
				alt={alt}
				className={cn(
					className,
					// Fade in quand l'image est chargée
					"transition-opacity duration-300",
					isLoaded ? "opacity-100" : "opacity-0"
				)}
				placeholder="empty"
				onLoad={() => setIsLoaded(true)}
			/>
		</div>
	);
}
