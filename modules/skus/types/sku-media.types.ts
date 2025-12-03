import { Prisma } from "@/app/generated/prisma";
import { z } from "zod";
import { GET_SKU_MEDIA_SELECT } from "../constants/sku-media.constants";
import { getSkuMediaSchema } from "../schemas/sku-media.schemas";

// ============================================================================
// FUNCTION TYPES
// ============================================================================

export type GetSkuMediaParams = z.infer<typeof getSkuMediaSchema>;

export type GetSkuMediaReturn = Prisma.SkuMediaGetPayload<{
	select: typeof GET_SKU_MEDIA_SELECT;
}>;
