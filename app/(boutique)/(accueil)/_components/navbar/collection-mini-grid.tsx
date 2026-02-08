import { COLLECTION_IMAGE_QUALITY } from "@/modules/collections/constants/image-sizes.constants";
import type { CollectionImage } from "@/modules/collections/types/collection.types";
import Image from "next/image";

/**
 * Mini-grid pour afficher les images de collection dans le menu mobile
 * Adapté à la taille 48x48 (size-12) avec layout similaire à CollectionImagesGrid
 *
 * Uses role="img" with aria-label on the container so screen readers
 * announce a single description instead of each individual image.
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
			<div
				className="size-12 rounded-lg overflow-hidden bg-muted shrink-0"
				role="img"
				aria-label={`Aperçu de la collection ${collectionName}`}
			>
				<Image
					src={images[0].url}
					alt=""
					width={48}
					height={48}
					className="size-full object-cover"
					sizes="48px"
					quality={COLLECTION_IMAGE_QUALITY}
					placeholder={images[0].blurDataUrl ? "blur" : "empty"}
					blurDataURL={images[0].blurDataUrl ?? undefined}
					aria-hidden="true"
				/>
			</div>
		);
	}

	// 2 images: 2 colonnes
	if (count === 2) {
		return (
			<div
				className="size-12 rounded-lg overflow-hidden bg-muted shrink-0 grid grid-cols-2 gap-px"
				role="img"
				aria-label={`Aperçu de la collection ${collectionName}`}
			>
				{images.slice(0, 2).map((image, i) => (
					<Image
						key={i}
						src={image.url}
						alt=""
						width={24}
						height={48}
						className="w-full h-12 object-cover"
						sizes="24px"
						quality={COLLECTION_IMAGE_QUALITY}
						placeholder={image.blurDataUrl ? "blur" : "empty"}
						blurDataURL={image.blurDataUrl ?? undefined}
						aria-hidden="true"
					/>
				))}
			</div>
		);
	}

	// 3-4 images: grille 2x2
	return (
		<div
			className="size-12 rounded-lg overflow-hidden bg-muted shrink-0 grid grid-cols-2 grid-rows-2 gap-px"
			role="img"
			aria-label={`Aperçu de la collection ${collectionName}`}
		>
			{images.slice(0, 4).map((image, i) => (
				<Image
					key={i}
					src={image.url}
					alt=""
					width={24}
					height={24}
					className="size-full object-cover"
					sizes="24px"
					quality={COLLECTION_IMAGE_QUALITY}
					placeholder={image.blurDataUrl ? "blur" : "empty"}
					blurDataURL={image.blurDataUrl ?? undefined}
					aria-hidden="true"
				/>
			))}
		</div>
	);
}
