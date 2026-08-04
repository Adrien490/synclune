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
	thumbnailUrl: string | null;
	blurDataUrl: string | null;
	altText: string | null;
	mediaType: "IMAGE" | "VIDEO";
	isPrimary: boolean;
	width: number | null;
	height: number | null;
}

interface ProductImageCellProps {
	images: ProductImage[];
	productTitle: string;
}

function toProductMedia(image: ProductImage, fallbackAlt: string): ProductMedia {
	return {
		id: image.id,
		url: image.url,
		thumbnailUrl: image.thumbnailUrl,
		alt: image.altText ?? fallbackAlt,
		blurDataUrl: image.blurDataUrl ?? undefined,
		width: image.width,
		height: image.height,
		mediaType: image.mediaType,
	};
}

/**
 * Image cell for the products datatable with lightbox on click.
 *
 * Vignette via `pickPrimaryImage()` (SSOT : primaire IMAGE → première IMAGE →
 * null) — le motif `find(isPrimary) ?? images[0]` mettait un `.mp4` dans
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
							alt={primaryImage.altText ?? productTitle}
							fill
							sizes="80px"
							quality={IMAGE_QUALITY.STANDARD}
							className="rounded-md object-cover"
							placeholder={primaryImage.blurDataUrl ? "blur" : "empty"}
							blurDataURL={primaryImage.blurDataUrl ?? undefined}
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
