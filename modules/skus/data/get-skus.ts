import { isAdmin } from "@/modules/auth/utils/guards";
import { z } from "zod";
import { getProductSkusSchema } from "../schemas/get-skus.schemas";
import { type GetProductSkusParams, type GetProductSkusReturn } from "../types/skus.types";
import { fetchProductSkus } from "./fetch-skus";

/**
 * Action serveur pour récupérer les SKUs de produits (admin uniquement)
 */
export async function getProductSkus(params: GetProductSkusParams): Promise<GetProductSkusReturn> {
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

		const validatedParams = validation.data;

		return await fetchProductSkus(validatedParams);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new Error("Invalid parameters");
		}

		throw error;
	}
}
