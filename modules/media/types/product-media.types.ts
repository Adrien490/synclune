export type ProductMedia = {
	id: string;
	url: string;
	thumbnailUrl?: string | null; // Thumbnail pour vidéos (poster)
	alt: string;
	blurDataUrl?: string;
	source?: "default" | "selected" | "sku";
	skuId?: string;
	mediaType: "IMAGE" | "VIDEO";
};
