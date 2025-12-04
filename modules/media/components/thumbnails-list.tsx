"use client";

import type { ProductMedia } from "@/modules/medias/types/product-media.types";
import { GalleryThumbnail } from "@/modules/medias/components/gallery-thumbnail";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
} from "@/shared/components/ui/carousel";
import { memo } from "react";

interface ThumbnailsListProps {
	medias: ProductMedia[];
	currentIndex: number;
	title: string;
	onNavigate: (index: number) => void;
	onError: (mediaId: string) => void;
	hasError: (mediaId: string) => boolean;
	/** Classe CSS additionnelle pour chaque thumbnail */
	thumbnailClassName?: string;
}

/**
 * Liste de thumbnails pour la galerie produit
 * Rendu en grille simple, réutilisable pour desktop et mobile
 */
function ThumbnailsGridComponent({
	medias,
	currentIndex,
	title,
	onNavigate,
	onError,
	hasError,
	thumbnailClassName,
}: ThumbnailsListProps) {
	return (
		<>
			{medias.map((media, index) => (
				<GalleryThumbnail
					key={media.id}
					media={media}
					index={index}
					isActive={index === currentIndex}
					hasError={hasError(media.id)}
					title={title}
					onClick={() => onNavigate(index)}
					onError={() => onError(media.id)}
					className={thumbnailClassName}
				/>
			))}
		</>
	);
}

export const ThumbnailsGrid = memo(ThumbnailsGridComponent);

interface ThumbnailsCarouselProps extends ThumbnailsListProps {
	/** Classe CSS pour le container du carousel */
	className?: string;
}

/**
 * Liste de thumbnails en carousel horizontal
 * Utilisé pour mobile quand il y a plus de 6 images
 */
function ThumbnailsCarouselComponent({
	medias,
	currentIndex,
	title,
	onNavigate,
	onError,
	hasError,
	className,
}: ThumbnailsCarouselProps) {
	return (
		<Carousel
			opts={{
				align: "start",
				dragFree: true,
			}}
			className={className}
		>
			<CarouselContent className="-ml-2">
				{medias.map((media, index) => (
					<CarouselItem key={media.id} className="pl-2 basis-1/4 sm:basis-1/5 md:basis-1/6">
						<GalleryThumbnail
							media={media}
							index={index}
							isActive={index === currentIndex}
							hasError={hasError(media.id)}
							title={title}
							onClick={() => onNavigate(index)}
							onError={() => onError(media.id)}
						/>
					</CarouselItem>
				))}
			</CarouselContent>
		</Carousel>
	);
}

export const ThumbnailsCarousel = memo(ThumbnailsCarouselComponent);
