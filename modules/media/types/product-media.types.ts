export type ProductMedia = {
	id: string;
	url: string;
	thumbnailUrl?: string | null; // Thumbnail for videos (poster)
	alt: string;
	blurDataUrl?: string;
	source?: "default" | "selected" | "sku";
	skuId?: string;
	mediaType: "IMAGE" | "VIDEO";
};
