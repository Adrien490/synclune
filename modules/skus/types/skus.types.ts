import { type Prisma } from "@/app/generated/prisma/client";
import { type PaginationInfo } from "@/shared/lib/pagination";
import { type z } from "zod";
import { type GET_PRODUCT_SKUS_DEFAULT_SELECT } from "../constants/sku.constants";
import { type getProductSkusSchema } from "../schemas/get-skus.schemas";

export type GetProductSkusReturn = {
	productSkus: Array<
		Prisma.ProductSkuGetPayload<{
			select: typeof GET_PRODUCT_SKUS_DEFAULT_SELECT;
		}>
	>;
	pagination: PaginationInfo;
	/**
	 * Id du représentant du produit — rang 0 de (position asc, id asc) parmi les
	 * variantes non supprimées (remplace `isDefault`, audit schéma V5, lot A2).
	 * `null` si la liste n'est pas bornée à un produit unique. Les composants de
	 * ligne en dérivent leur prop `isRepresentative`.
	 */
	representativeSkuId: string | null;
	error?: string;
};

export type GetProductSkusParams = z.infer<typeof getProductSkusSchema>;
