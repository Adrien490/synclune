import { isAdmin } from "@/modules/auth/utils/guards";
import { z } from "zod";
import {
	GET_PRODUCT_SKUS_ADMIN_FALLBACK_SORT_BY,
	GET_PRODUCT_SKUS_DEFAULT_SORT_BY,
} from "../constants/sku.constants";
import { getProductSkusSchema } from "../schemas/get-skus.schemas";
import { GetProductSkusParams, GetProductSkusReturn } from "../types/skus.types";
import { fetchProductSkus } from "./fetch-skus";

/**
 * Action serveur pour récupérer les SKUs de produits (admin uniquement)
 */
export async function getProductSkus(
	params: GetProductSkusParams
): Promise<GetProductSkusReturn> {
	try {
		const admin = await isAdmin();

		// Vérification d'accès admin obligatoire
		if (!admin) {
			throw new Error("Admin access required");
		}

		const validation = getProductSkusSchema.safeParse(params);

		if (!validation.success) {
			throw new Error("Invalid parameters");
		}

		let validatedParams = validation.data;

		// Ajustement automatique du tri pour les admins
		if (
			validatedParams.sortBy === GET_PRODUCT_SKUS_DEFAULT_SORT_BY &&
			!params?.sortBy
		) {
			validatedParams = {
				...validatedParams,
				sortBy: GET_PRODUCT_SKUS_ADMIN_FALLBACK_SORT_BY,
			};
		}

		return await fetchProductSkus(validatedParams);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new Error("Invalid parameters");
		}

		throw error;
	}
}
