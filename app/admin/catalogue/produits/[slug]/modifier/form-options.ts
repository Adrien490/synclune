// Form options for editing a product
import type { ProductStatus } from "@/app/generated/prisma";

// Form options shared between client and server for editing
export const editProductFormOpts = {
	defaultValues: {
		productId: "",
		title: "",
		description: "",
		typeId: "",
		collectionId: "",
		status: "PUBLIC" as ProductStatus,
		defaultSku: {
			skuId: "",
			priceInclTaxEuros: 0,
			compareAtPriceEuros: undefined as number | undefined,
			inventory: 0,
			isActive: true,
			colorId: "",
			materialId: "",
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
	},
};
