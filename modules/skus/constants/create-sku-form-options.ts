// Form options partagées entre client et serveur

import type { MediaData } from "@/modules/skus/types/sku-form.types";

export const createProductSkuFormOpts = {
	defaultValues: {
		productId: "",
		sku: "",
		priceInclTaxEuros: null as number | null,
		compareAtPriceEuros: undefined as number | undefined,
		inventory: null as number | null,
		isDefault: false,
		isActive: true,
		colorId: "",
		materialId: "",
		size: "",
		primaryImage: undefined as MediaData | undefined,
		galleryMedia: [] as MediaData[],
	},
};
