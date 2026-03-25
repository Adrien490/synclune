"use client";

import { useState, lazy, Suspense } from "react";
import Image from "next/image";

import { Package } from "lucide-react";

import { useLightbox } from "@/shared/hooks";

// Lazy loading - lightbox charge uniquement a l'ouverture
const MediaLightbox = lazy(() => import("@/modules/media/components/media-lightbox"));

interface ProductImage {
	url: string;
	blurDataUrl: string | null;
	altText: string | null;
	isPrimary: boolean;
}

interface ProductImageCellProps {
	images: ProductImage[];
	productTitle: string;
}

/**
 * Image cell for the products datatable with lightbox on click.
 * Opens MediaLightbox with all images from the default SKU.
 */
export function ProductImageCell({ images, productTitle }: ProductImageCellProps) {
	const { isOpen, open, close } = useLightbox();
	const [currentIndex, setCurrentIndex] = useState(0);

	const primaryImage = images.find((img) => img.isPrimary) ?? images[0];
	const hasImages = images.length > 0 && primaryImage;

	const slides = images.map((img) => ({
		src: img.url,
		alt: img.altText ?? productTitle,
	}));

	return (
		<>
			<div className="bg-muted relative h-20 w-20 shrink-0 rounded-md">
				{hasImages ? (
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
							quality={80}
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
						<Package className="text-muted-foreground h-8 w-8" aria-hidden="true" />
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
