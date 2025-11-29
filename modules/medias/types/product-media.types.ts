export type ProductMedia = {
	id: string;
	url: string;
	thumbnailUrl?: string | null; // URL de la miniature pour les vidéos
	alt: string;
	blurDataURL?: string;
	source?: "default" | "selected" | "sku";
	skuId?: string;
	mediaType: "IMAGE" | "VIDEO"; // Type de média pour différencier images et vidéos (depuis la base de données)
};
