"use client";

import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { cn } from "@/shared/utils/cn";
import { useLightbox } from "@/shared/hooks";

// Lazy loading - lightbox charge uniquement a l'ouverture
const MediaLightbox = dynamic(
	() => import("@/modules/media/components/media-lightbox"),
	{ ssr: false }
);

interface ReviewMedia {
	id: string;
	url: string;
	altText: string | null;
	blurDataUrl: string | null;
}

interface ReviewCardGalleryProps {
	medias: ReviewMedia[];
}

/**
 * Galerie de photos d'un avis client (Client Component)
 * Gère l'état du lightbox et le chargement des images
 */
export function ReviewCardGallery({ medias }: ReviewCardGalleryProps) {
	const { isOpen, open, close } = useLightbox();
	const [lightboxIndex, setLightboxIndex] = useState(0);
	const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

	const openLightbox = (index: number) => {
		setLightboxIndex(index);
		open();
	};

	return (
		<>
			<div className="flex gap-2 flex-wrap">
				{medias.map((media, index) => (
					<button
						key={media.id}
						type="button"
						onClick={() => openLightbox(index)}
						aria-label={`Voir la photo ${index + 1} de l'avis`}
						className="relative size-20 md:size-24 rounded-lg overflow-hidden group cursor-zoom-in focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					>
						{/* Skeleton shimmer while loading (only when no blur placeholder) */}
						{!loadedImages.has(media.id) && !media.blurDataUrl && (
							<div className="absolute inset-0 animate-shimmer rounded-lg" />
						)}
						<Image
							src={media.url}
							alt={media.altText || `Photo ${index + 1}`}
							fill
							onLoad={() => setLoadedImages((prev) => new Set(prev).add(media.id))}
							className={cn(
								"object-cover motion-safe:transition-[transform,opacity] motion-safe:duration-300 motion-safe:group-hover:scale-105",
								loadedImages.has(media.id) ? "opacity-100" : "opacity-0"
							)}
							placeholder={media.blurDataUrl ? "blur" : "empty"}
							blurDataURL={media.blurDataUrl ?? undefined}
							sizes="(min-width: 768px) 96px, 80px"
							quality={75}
						/>
					</button>
				))}
			</div>
			<MediaLightbox
				open={isOpen}
				close={close}
				slides={medias.map((m) => ({ src: m.url, alt: m.altText || `Photo de l'avis` }))}
				index={lightboxIndex}
			/>
		</>
	);
}
