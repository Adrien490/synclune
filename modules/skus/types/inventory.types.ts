import { Prisma } from "@/app/generated/prisma/client";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import { z } from "zod";
import { GET_INVENTORY_SELECT } from "../constants/inventory.constants";
import { getSkuStocksSchema, inventoryFiltersSchema } from "../schemas/inventory.schemas";

export type SkuStock = Prisma.ProductSkuGetPayload<{
	select: typeof GET_INVENTORY_SELECT;
}>;

export type GetSkuStocksReturn = {
	items: SkuStock[];

	pagination: PaginationInfo;
};

export type GetSkuStocksParams = z.infer<typeof getSkuStocksSchema>;

export type InventoryFilters = z.infer<typeof inventoryFiltersSchema>;
