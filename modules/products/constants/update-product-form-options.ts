// Form options for editing a product
import type { ProductStatus } from "@/app/generated/prisma/client";

// Form options shared between client and server for editing
export const editProductFormOpts = {
	defaultValues: {
		productId: "",
		title: "",
		description: "",
		typeId: "",
		collectionIds: [] as string[],
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
						thumbnailUrl?: string | null;
						thumbnailSmallUrl?: string | null;
						altText?: string;
						mediaType: "IMAGE" | "VIDEO";
				  }
				| undefined,
			galleryMedia: [] as Array<{
				url: string;
				thumbnailUrl?: string | null;
				thumbnailSmallUrl?: string | null;
				altText?: string;
				mediaType: "IMAGE" | "VIDEO";
			}>,
		},
	},
};
