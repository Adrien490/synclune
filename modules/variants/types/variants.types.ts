import { type Prisma } from "@/app/generated/prisma/client";
import { type PaginationInfo } from "@/shared/lib/pagination";
import { type z } from "zod";
import { type GET_PRODUCT_VARIANTS_DEFAULT_SELECT } from "../constants/variant.constants";
import { type getProductVariantsSchema } from "../schemas/get-variants.schemas";

export type GetProductVariantsReturn = {
	productVariants: Array<
		Prisma.ProductVariantGetPayload<{
			select: typeof GET_PRODUCT_VARIANTS_DEFAULT_SELECT;
		}>
	>;
	pagination: PaginationInfo;
	/**
	 * Id du représentant du produit — rang 0 de (position asc, id asc) parmi les
	 * variantes non supprimées (remplace `isDefault`, audit schéma V5, lot A2).
	 * `null` si la liste n'est pas bornée à un produit unique. Les composants de
	 * ligne en dérivent leur prop `isRepresentative`.
	 */
	representativeVariantId: string | null;
	error?: string;
};

export type GetProductVariantsParams = z.infer<typeof getProductVariantsSchema>;
