import { isAdmin } from "@/modules/auth/utils/guards";
import { forbidden } from "next/navigation";
import { getProductSkusSchema } from "../schemas/get-skus.schemas";
import { type GetProductSkusParams, type GetProductSkusReturn } from "../types/skus.types";
import { fetchProductSkus } from "./fetch-skus";

/**
 * Action serveur pour récupérer les SKUs de produits (admin uniquement)
 */
export async function getProductSkus(params: GetProductSkusParams): Promise<GetProductSkusReturn> {
	const admin = await isAdmin();

	if (!admin) {
		forbidden();
	}

	const validation = getProductSkusSchema.safeParse(params);

	if (!validation.success) {
		return {
			productSkus: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		};
	}

	return fetchProductSkus(validation.data);
}
