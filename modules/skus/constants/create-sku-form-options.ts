// Form options partagées entre client et serveur

export const createProductSkuFormOpts = {
	defaultValues: {
		productId: "",
		sku: "",
		priceInclTaxEuros: 0,
		compareAtPriceEuros: undefined as number | undefined,
		inventory: 0,
		isDefault: false,
		isActive: true,
		colorId: "",
		material: "",
		size: "",
		primaryImage: undefined as
			| {
					url: string;
					altText?: string;
					mediaType: "IMAGE" | "VIDEO";
			  }
			| undefined,
		galleryMedia: [] as Array<{
			url: string;
			altText?: string;
			mediaType: "IMAGE" | "VIDEO";
		}>,
	},
};
