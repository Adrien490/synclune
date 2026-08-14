"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/admin-auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import {
	validateInput,
	handleActionError,
	success,
	error,
	notFound,
	safeFormGet,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_PRODUCT_TYPE_LIMITS } from "@/shared/lib/rate-limit-config";
import { generateUniqueReadableName } from "@/shared/services/unique-name-generator.service";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";

import { getProductTypeInvalidationTags } from "../utils/cache.utils";
import { duplicateProductTypeSchema } from "../schemas/product-type.schemas";

/**
 * Server Action pour dupliquer un ProductType
 *
 * Creee une copie avec:
 * - Un nouveau label ("Original (copie)" ou "Original (copie N)")
 * - Un nouveau slug auto-genere
 * - isActive: false (draft par defaut, evite l'activation accidentelle)
 * - isSystem: false (une copie n'est jamais un type systeme)
 */
export async function duplicateProductType(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_TYPE_LIMITS.DUPLICATE);
		if ("error" in rateLimit) return rateLimit.error;

		const rawData = {
			productTypeId: safeFormGet(formData, "productTypeId"),
		};

		const validated = validateInput(duplicateProductTypeSchema, rawData);
		if ("error" in validated) return validated.error;
		const { productTypeId } = validated.data;

		const original = await prisma.productType.findUnique({
			where: { id: productTypeId },
		});

		if (!original) {
			return notFound("Type de produit");
		}

		const nameResult = await generateUniqueReadableName(original.label, async (label) => {
			const existing = await prisma.productType.findFirst({
				where: { label: { equals: label, mode: "insensitive" } },
			});
			return existing !== null;
		});

		if (!nameResult.success || !nameResult.name) {
			return error(nameResult.error ?? "Impossible de générer un nom unique");
		}

		const newLabel = nameResult.name;
		const slug = await generateSlug(prisma, "productType", newLabel);

		const duplicate = await prisma.productType.create({
			data: {
				label: newLabel,
				slug,
				description: original.description,
				isActive: false,
				isSystem: false,
			},
		});

		getProductTypeInvalidationTags(duplicate.slug).forEach((tag) => updateTag(tag));

		return success(`Type "${duplicate.label}" dupliqué`, {
			id: duplicate.id,
			label: duplicate.label,
			slug: duplicate.slug,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de dupliquer le type de produit");
	}
}
