export type ProductMedia = {
	id: string;
	url: string;
	thumbnailUrl?: string | null; // MEDIUM (480px) - poster vidéo
	thumbnailSmallUrl?: string | null; // SMALL (160px) - miniatures galerie
	alt: string;
	blurDataUrl?: string;
	source?: "default" | "selected" | "sku";
	skuId?: string;
	mediaType: "IMAGE" | "VIDEO";
};
