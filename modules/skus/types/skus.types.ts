import { Prisma } from "@/app/generated/prisma/client";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import { z } from "zod";
import { GET_PRODUCT_SKUS_DEFAULT_SELECT } from "../constants/sku.constants";
import { getProductSkusSchema } from "../schemas/get-skus.schemas";

export type GetProductSkusReturn = {
	productSkus: Array<
		Prisma.ProductSkuGetPayload<{
			select: typeof GET_PRODUCT_SKUS_DEFAULT_SELECT;
		}>
	>;
	pagination: PaginationInfo;
};

export type GetProductSkusParams = z.infer<typeof getProductSkusSchema>;
