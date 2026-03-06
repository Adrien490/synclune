import { isAdmin } from "@/modules/auth/utils/guards";
import { redirect } from "next/navigation";
import { getProductSkusSchema } from "../schemas/get-skus.schemas";
import { type GetProductSkusParams, type GetProductSkusReturn } from "../types/skus.types";
import { fetchProductSkus } from "./fetch-skus";

/**
 * Action serveur pour récupérer les SKUs de produits (admin uniquement)
 */
export async function getProductSkus(params: GetProductSkusParams): Promise<GetProductSkusReturn> {
	const admin = await isAdmin();

	// Vérification d'accès admin obligatoire
	if (!admin) {
		redirect("/connexion");
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
