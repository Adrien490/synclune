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
};

export type GetProductSkusParams = z.infer<typeof getProductSkusSchema>;
