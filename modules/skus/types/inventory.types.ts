import { type Prisma } from "@/app/generated/prisma/client";
import { type PaginationInfo } from "@/shared/lib/pagination";
import { type z } from "zod";
import { type GET_INVENTORY_SELECT } from "../constants/inventory.constants";
import { type getSkuStocksSchema, type inventoryFiltersSchema } from "../schemas/inventory.schemas";

export type SkuStock = Prisma.ProductSkuGetPayload<{
	select: typeof GET_INVENTORY_SELECT;
}>;

export type GetSkuStocksReturn = {
	items: SkuStock[];

	pagination: PaginationInfo;
};

export type GetSkuStocksParams = z.infer<typeof getSkuStocksSchema>;

export type InventoryFilters = z.infer<typeof inventoryFiltersSchema>;
