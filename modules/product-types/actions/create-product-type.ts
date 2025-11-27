"use server";

import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";

import { PRODUCT_TYPES_CACHE_TAGS } from "../constants/cache";
import { createProductTypeSchema } from "../schemas/product-type.schemas";

export async function createProductType(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification de l'authentification et des droits admin
		const user = await getCurrentUser();

		if (!user) {
			return {
				status: ActionStatus.ERROR,
				message: "Vous devez etre connecte pour effectuer cette action",
			};
		}

		if (user.role !== "ADMIN") {
			return {
				status: ActionStatus.ERROR,
				message:
					"Seuls les administrateurs peuvent creer des types de produits",
			};
		}

		// 2. Extraire les donnees du FormData
		const rawData = {
			label: formData.get("label"),
			description: formData.get("description") || undefined,
		};

		// 3. Valider les donnees
		const validation = createProductTypeSchema.safeParse(rawData);

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const validatedData = validation.data;

		// 4. Verifier l'unicite du label
		const existingLabel = await prisma.productType.findFirst({
			where: { label: validatedData.label },
		});

		if (existingLabel) {
			return {
				status: ActionStatus.ERROR,
				message: "Ce label de type existe deja. Veuillez en choisir un autre.",
			};
		}

		// 5. Generer un slug unique automatiquement
		const slug = await generateSlug(prisma, "productType", validatedData.label);

		// 6. Creer le type de produit
		await prisma.productType.create({
			data: {
				label: validatedData.label,
				description: validatedData.description,
				slug,
				isActive: true,
				isSystem: false, // Les types crees manuellement ne sont pas systeme
			},
		});

		// 7. Invalider le cache des types de produits
		updateTag(PRODUCT_TYPES_CACHE_TAGS.LIST);

		return {
			status: ActionStatus.SUCCESS,
			message: "Type de produit cree avec succes",
		};
	} catch (error) {
// console.error("Erreur lors de la creation du type de produit:", error);

		if (error instanceof Error) {
			return {
				status: ActionStatus.ERROR,
				message: error.message,
			};
		}

		return {
			status: ActionStatus.ERROR,
			message:
				"Une erreur est survenue lors de la creation du type de produit",
		};
	}
}
