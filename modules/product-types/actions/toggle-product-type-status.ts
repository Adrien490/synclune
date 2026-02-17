"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error, notFound } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";

import { getProductTypeInvalidationTags } from "../utils/cache.utils";
import { toggleProductTypeStatusSchema } from "../schemas/product-type.schemas";

export async function toggleProductTypeStatus(
	prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rawData = {
			productTypeId: formData.get("productTypeId") as string,
			isActive: formData.get("isActive") === "true",
		};

		const validated = validateInput(toggleProductTypeStatusSchema, rawData);
		if ("error" in validated) return validated.error;

		const { productTypeId, isActive } = validated.data;

		// Verifier que le type existe et n'est pas systeme
		const productType = await prisma.productType.findUnique({
			where: { id: productTypeId },
			select: { id: true, isSystem: true, label: true },
		});

		if (!productType) {
			return notFound("Type de produit");
		}

		if (productType.isSystem) {
			return error(`Le type "${productType.label}" est un type systeme et ne peut pas etre modifie`);
		}

		// Mettre a jour le statut
		await prisma.productType.update({
			where: { id: productTypeId },
			data: { isActive },
		});

		getProductTypeInvalidationTags().forEach((tag) => updateTag(tag));

		return success(`Type ${isActive ? "activé" : "désactivé"} avec succès`);
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut");
	}
}
