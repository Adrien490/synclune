import { COLLECTION_IMAGE_QUALITY } from "@/modules/collections/constants/image-sizes.constants";
import type { CollectionImage } from "@/modules/collections/types/collection.types";
import Image from "next/image";

/**
 * Mini-grid pour afficher les images de collection dans le menu mobile
 * Adapté à la taille 48x48 (size-12) avec layout similaire à CollectionImagesGrid
 */
export function CollectionMiniGrid({
	images,
	collectionName,
}: {
	images: CollectionImage[];
	collectionName: string;
}) {
	const count = images.length;

	// 1 image: pleine taille
	if (count === 1) {
		return (
			<div className="size-12 rounded-lg overflow-hidden bg-muted shrink-0">
				<Image
					src={images[0].url}
					alt={images[0].alt || `Image de la collection ${collectionName}`}
					width={48}
					height={48}
					className="size-full object-cover"
					sizes="48px"
					quality={COLLECTION_IMAGE_QUALITY}
					placeholder={images[0].blurDataUrl ? "blur" : "empty"}
					blurDataURL={images[0].blurDataUrl ?? undefined}
				/>
			</div>
		);
	}

	// 2 images: 2 colonnes
	if (count === 2) {
		return (
			<div className="size-12 rounded-lg overflow-hidden bg-muted shrink-0 grid grid-cols-2 gap-px">
				{images.slice(0, 2).map((image, i) => (
					<Image
						key={i}
						src={image.url}
						alt={image.alt || `Image ${i + 1} de la collection ${collectionName}`}
						width={24}
						height={48}
						className="w-full h-12 object-cover"
						sizes="24px"
						quality={COLLECTION_IMAGE_QUALITY}
						placeholder={image.blurDataUrl ? "blur" : "empty"}
						blurDataURL={image.blurDataUrl ?? undefined}
					/>
				))}
			</div>
		);
	}

	// 3-4 images: grille 2x2
	return (
		<div className="size-12 rounded-lg overflow-hidden bg-muted shrink-0 grid grid-cols-2 grid-rows-2 gap-px">
			{images.slice(0, 4).map((image, i) => (
				<Image
					key={i}
					src={image.url}
					alt={image.alt || `Image ${i + 1} de la collection ${collectionName}`}
					width={24}
					height={24}
					className="size-full object-cover"
					sizes="24px"
					quality={COLLECTION_IMAGE_QUALITY}
					placeholder={image.blurDataUrl ? "blur" : "empty"}
					blurDataURL={image.blurDataUrl ?? undefined}
				/>
			))}
		</div>
	);
}
