// Form options partagées entre client et serveur

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
		primaryImage: undefined as
			| {
					url: string;
					thumbnailUrl?: string | null;
					thumbnailSmallUrl?: string | null;
					blurDataUrl?: string;
					altText?: string;
					mediaType: "IMAGE" | "VIDEO";
			  }
			| undefined,
		galleryMedia: [] as Array<{
			url: string;
			thumbnailUrl?: string | null;
			thumbnailSmallUrl?: string | null;
			blurDataUrl?: string;
			altText?: string;
			mediaType: "IMAGE" | "VIDEO";
		}>,
	},
};
