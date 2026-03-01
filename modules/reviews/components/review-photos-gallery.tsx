"use client";

import { useState } from "react";
import Image from "next/image";

import { useLightbox } from "@/shared/hooks";
import dynamic from "next/dynamic";

// Lazy loading - lightbox charge uniquement a l'ouverture
const MediaLightbox = dynamic(() => import("@/modules/media/components/media-lightbox"), {
	ssr: false,
});

import type { ReviewPublic } from "../types/review.types";

interface PhotoWithReview {
	id: string;
	url: string;
	blurDataUrl: string | null;
	altText: string | null;
	reviewId: string;
	userName: string | null;
}

interface ReviewPhotosGalleryProps {
	reviews: ReviewPublic[];
}

/**
 * Galerie agrégée des photos clients (Baymard best practice)
 * Affiche toutes les photos des avis et permet de naviguer vers l'avis correspondant
 */
export function ReviewPhotosGallery({ reviews }: ReviewPhotosGalleryProps) {
	const { isOpen, open, close } = useLightbox();
	const [currentIndex, setCurrentIndex] = useState(0);

	// Extraire toutes les photos avec leur reviewId
	const allPhotos: PhotoWithReview[] = reviews.flatMap((review) =>
		review.medias.map((media) => ({
			...media,
			reviewId: review.id,
			userName: review.user.name,
		})),
	);

	// Ne rien afficher si aucune photo
	if (allPhotos.length === 0) {
		return null;
	}

	const openAtIndex = (index: number) => {
		setCurrentIndex(index);
		open();
	};

	const handleClose = () => {
		close();

		// Scroll vers l'avis correspondant à la photo actuellement affichée
		const currentPhoto = allPhotos[currentIndex];
		if (currentPhoto) {
			document
				.getElementById(`review-${currentPhoto.reviewId}`)
				?.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	};

	const slides = allPhotos.map((photo) => ({
		src: photo.url,
		alt: photo.altText ?? "Photo client",
	}));

	return (
		<section aria-labelledby="customer-photos-heading" className="space-y-3">
			<h3 id="customer-photos-heading" className="text-foreground text-sm font-medium">
				Photos clients ({allPhotos.length})
			</h3>

			<div className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
				{allPhotos.map((photo, index) => (
					<button
						key={photo.id}
						type="button"
						onClick={() => openAtIndex(index)}
						aria-label={`Photo ${index + 1} de l'avis de ${photo.userName ?? "Anonyme"}`}
						className="group focus-visible:ring-ring relative size-20 flex-shrink-0 cursor-zoom-in overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2"
					>
						<Image
							src={photo.url}
							alt={photo.altText ?? `Photo ${index + 1}`}
							fill
							placeholder={photo.blurDataUrl ? "blur" : "empty"}
							blurDataURL={photo.blurDataUrl ?? undefined}
							className="object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
							sizes="80px"
							quality={75}
						/>
					</button>
				))}
			</div>

			<MediaLightbox
				open={isOpen}
				close={handleClose}
				slides={slides}
				index={currentIndex}
				onIndexChange={setCurrentIndex}
			/>
		</section>
	);
}
