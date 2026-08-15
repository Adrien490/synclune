"use server";

import { updateTag } from "next/cache";

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
import { generateUniqueReadableName } from "@/shared/services/unique-name-generator.service";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";

import { getProductTypeInvalidationTags } from "../utils/cache.utils";
import { duplicateProductTypeSchema } from "../schemas/product-type.schemas";

/**
 * Server Action pour dupliquer un ProductType
 *
 * Creee une copie avec un nouveau label ("Original (copie)" ou
 * "Original (copie N)") et un nouveau slug auto-genere.
 */
export async function duplicateProductType(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

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
			},
		});

		getProductTypeInvalidationTags(duplicate.slug).forEach((tag) => updateTag(tag));

		return success(`Type "${duplicate.label}" dupliqué`, {
			id: duplicate.id,
			name: duplicate.label,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de dupliquer le type de produit");
	}
}
