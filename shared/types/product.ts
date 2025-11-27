export type ProductMedia = {
	id: string;
	url: string;
	alt: string;
	blurDataURL?: string;
	source?: "default" | "selected" | "sku";
	skuId?: string;
	mediaType: "IMAGE" | "VIDEO"; // Type de média pour différencier images et vidéos (depuis la base de données)
};
