// shared-code.ts - Form options partagées entre client et serveur
import type { ProductStatus } from "@/app/generated/prisma/client";

// Form options shared between client and server
export const createProductFormOpts = {
	defaultValues: {
		title: "",
		description: "",
		typeId: "",
		collectionId: "",
		status: "PUBLIC" as ProductStatus,
		initialSku: {
			sku: "",
			priceInclTaxEuros: 0,
			compareAtPriceEuros: undefined as number | undefined,
			inventory: 1,
			isDefault: true,
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
	},
};
