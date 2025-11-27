"use server";

import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";

import { PRODUCT_TYPES_CACHE_TAGS } from "../constants/cache";
import { updateProductTypeSchema } from "../schemas/product-type.schemas";

export async function updateProductType(
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
					"Seuls les administrateurs peuvent modifier des types de produits",
			};
		}

		// 2. Extraire les donnees du FormData
		const rawData = {
			id: formData.get("id"),
			label: formData.get("label"),
			description: formData.get("description") || undefined,
		};

		// 3. Valider les donnees
		const validation = updateProductTypeSchema.safeParse(rawData);

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const validatedData = validation.data;

		// 4. Verifier que le type existe
		const existingType = await prisma.productType.findUnique({
			where: { id: validatedData.id },
		});

		if (!existingType) {
			return {
				status: ActionStatus.ERROR,
				message: "Ce type de produit n'existe pas",
			};
		}

		// 5. Protection: Les types systeme ne peuvent pas etre modifies (label/slug)
		if (existingType.isSystem) {
			return {
				status: ActionStatus.ERROR,
				message: `Le type "${existingType.label}" est un type systeme et ne peut pas etre modifie`,
			};
		}

		// 6. Verifier l'unicite du label (sauf si c'est le meme)
		if (validatedData.label !== existingType.label) {
			const labelExists = await prisma.productType.findFirst({
				where: { label: validatedData.label },
			});

			if (labelExists) {
				return {
					status: ActionStatus.ERROR,
					message:
						"Ce label de type existe deja. Veuillez en choisir un autre.",
				};
			}
		}

		// 7. Generer un nouveau slug si le label a change
		const slug =
			validatedData.label !== existingType.label
				? await generateSlug(prisma, "productType", validatedData.label)
				: existingType.slug;

		// 8. Mettre a jour le type
		await prisma.productType.update({
			where: { id: validatedData.id },
			data: {
				label: validatedData.label,
				description: validatedData.description,
				slug,
			},
		});

		// 9. Invalider le cache des types de produits
		updateTag(PRODUCT_TYPES_CACHE_TAGS.LIST);

		return {
			status: ActionStatus.SUCCESS,
			message: "Type de produit modifie avec succes",
		};
	} catch (error) {
// console.error("Erreur lors de la modification du type de produit:", error);

		if (error instanceof Error) {
			return {
				status: ActionStatus.ERROR,
				message: error.message,
			};
		}

		return {
			status: ActionStatus.ERROR,
			message:
				"Une erreur est survenue lors de la modification du type de produit",
		};
	}
}
