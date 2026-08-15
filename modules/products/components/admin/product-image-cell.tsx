"use client";

import { useState, lazy, Suspense } from "react";
import Image from "next/image";

import { PackageIcon } from "@phosphor-icons/react/ssr";
import { useReducedMotion } from "motion/react";

import { useLightbox } from "@/shared/hooks";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import { buildLightboxSlides } from "@/modules/media/services/lightbox-builder.service";
import type { ProductMedia } from "@/modules/media/types/product-media.types";
import { pickPrimaryImage } from "@/modules/products/services/product-display.service";

// Lazy loading - lightbox charge uniquement a l'ouverture
const MediaLightbox = lazy(() => import("@/modules/media/components/media-lightbox"));

interface ProductImage {
	id: string;
	url: string;
	alt: string | null;
	type: "IMAGE" | "VIDEO";
}

interface ProductImageCellProps {
	images: ProductImage[];
	productTitle: string;
}

function toProductMedia(image: ProductImage, fallbackAlt: string): ProductMedia {
	return {
		id: image.id,
		url: image.url,
		alt: image.alt ?? fallbackAlt,
		type: image.type,
	};
}

/**
 * Image cell for the products datatable with lightbox on click.
 *
 * Vignette via `pickPrimaryImage()` (SSOT : première IMAGE de l'ordre canonique
 * → null) — prendre `images[0]` sans filtre mettait un `.mp4` dans
 * `<Image src>`. Slides via `buildLightboxSlides` : les vidéos de la variante
 * partaient toutes en slides *image* dans la lightbox.
 */
export function ProductImageCell({ images, productTitle }: ProductImageCellProps) {
	const { isOpen, open, close } = useLightbox();
	const prefersReducedMotion = useReducedMotion();
	const [currentIndex, setCurrentIndex] = useState(0);

	const primaryImage = pickPrimaryImage(images);

	const slides = buildLightboxSlides(
		images.map((img) => toProductMedia(img, productTitle)),
		prefersReducedMotion ?? false,
	);

	return (
		<>
			<div className="bg-muted relative size-20 shrink-0 rounded-md">
				{primaryImage ? (
					<button
						type="button"
						onClick={() => {
							setCurrentIndex(0);
							open();
						}}
						className="focus-visible:ring-ring relative h-full w-full cursor-pointer rounded-md focus-visible:ring-2 focus-visible:ring-offset-2"
						aria-label={`Voir les images de ${productTitle}`}
					>
						<Image
							src={primaryImage.url}
							alt={primaryImage.alt ?? productTitle}
							fill
							sizes="80px"
							quality={IMAGE_QUALITY.STANDARD}
							className="rounded-md object-cover"
						/>
					</button>
				) : (
					<div
						className="bg-muted flex h-full w-full items-center justify-center rounded-md"
						role="img"
						aria-label="Aucune image disponible"
					>
						<PackageIcon className="text-muted-foreground size-8" aria-hidden="true" />
					</div>
				)}
			</div>

			{isOpen && (
				<Suspense>
					<MediaLightbox
						open={isOpen}
						close={close}
						slides={slides}
						index={currentIndex}
						onIndexChange={setCurrentIndex}
					/>
				</Suspense>
			)}
		</>
	);
}
