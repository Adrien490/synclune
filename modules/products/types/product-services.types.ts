// Re-export des types depuis product.types.ts (source de vérité)
export type {
	ProductSku,
	ProductType,
	ProductVariantInfo,
} from "./product.types";

// ============================================================================
// TYPES SPÉCIFIQUES AUX SERVICES
// ============================================================================

export type SkuVariant = {
	sku: string;
	color?: {
		id: string;
		slug: string;
		name: string;
		hex: string;
	};
	material?: string;
	size?: string;
	priceInclTax: number;
	compareAtPrice?: number;
	inventory: number;
	isActive: boolean;
	images: Array<{
		id: string;
		url: string;
		altText?: string;
		isPrimary: boolean;
	}>;
};

// ============================================================================
// PRODUCT MEDIA
// ============================================================================

export type ProductImage = {
	id: string;
	url: string;
	alt: string;
	mediaType: "IMAGE" | "VIDEO";
	blurDataURL?: string;
	source: "default" | "selected" | "sku";
	skuId?: string;
};

// ============================================================================
// PRODUCT STOCK
// ============================================================================

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type ProductStockInfo = {
	status: StockStatus;
	totalInventory: number;
	availableSkus: number;
	message: string;
};

// ============================================================================
// PRODUCT JEWELRY
// ============================================================================

export type JewelryDimensions = {
	// Dimensions textuelles
	dimensions?: string;

	// Informations dérivées
	requiresSize: boolean;
};
