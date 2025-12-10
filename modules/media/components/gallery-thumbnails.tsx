"use client";

import type { ProductMedia } from "@/modules/media/types/product-media.types";
import { GalleryThumbnail } from "@/modules/media/components/gallery-thumbnail";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
} from "@/shared/components/ui/carousel";

interface ThumbnailsListProps {
	medias: ProductMedia[];
	currentIndex: number;
	title: string;
	onNavigate: (index: number) => void;
	onError: (mediaId: string) => void;
	hasError: (mediaId: string) => boolean;
	/** Classe CSS additionnelle pour chaque thumbnail */
	thumbnailClassName?: string;
	/** Classe CSS pour le container */
	className?: string;
}

/**
 * Liste de thumbnails pour la galerie produit
 * Rendu en grille simple, réutilisable pour desktop et mobile
 */
export function GalleryThumbnailsGrid({
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
					isLCPCandidate={index === 0}
				/>
			))}
		</>
	);
}

/**
 * Liste de thumbnails en carousel horizontal
 * Utilisé pour mobile quand il y a plus de 6 images
 * Inclut des indicateurs de scroll (gradients) aux bords
 */
export function GalleryThumbnailsCarousel({
	medias,
	currentIndex,
	title,
	onNavigate,
	onError,
	hasError,
	thumbnailClassName,
	className,
}: ThumbnailsListProps) {
	return (
		<div className="relative">
			<Carousel
				opts={{
					align: "start",
					dragFree: true,
				}}
				className={className}
			>
				<CarouselContent className="-ml-2">
					{medias.map((media, index) => (
						<CarouselItem
							key={media.id}
							className="pl-2 basis-1/4 sm:basis-1/5 md:basis-1/6"
						>
							<GalleryThumbnail
								media={media}
								index={index}
								isActive={index === currentIndex}
								hasError={hasError(media.id)}
								title={title}
								onClick={() => onNavigate(index)}
								onError={() => onError(media.id)}
								className={thumbnailClassName}
								isLCPCandidate={index === 0}
							/>
						</CarouselItem>
					))}
				</CarouselContent>
			</Carousel>
			{/* Gradients indiquant qu'on peut scroller horizontalement */}
			<div
				className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none"
				aria-hidden="true"
			/>
		</div>
	);
}
