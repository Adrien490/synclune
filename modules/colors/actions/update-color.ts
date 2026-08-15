"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";

import { getColorInvalidationTags } from "../constants/cache";
import { updateColorSchema } from "../schemas/color.schemas";

export async function updateColor(_prevState: unknown, formData: FormData): Promise<ActionState> {
	try {
		// 1. Admin authorization check
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 2. Extract data from FormData
		const rawData = {
			id: formData.get("id"),
			name: sanitizeText(safeFormGet(formData, "name") ?? ""),
			hex: formData.get("hex"),
		};

		// Validate data
		const validated = validateInput(updateColorSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Check that the color exists
		const existingColor = await prisma.color.findUnique({
			where: { id: validatedData.id },
		});

		if (!existingColor) {
			return error("Cette couleur n'existe pas");
		}

		// Check name uniqueness (skip if unchanged) — insensible à la casse.
		// `id: { not }` : un rename purement cosmétique (« Or rose » → « Or Rose »)
		// se retrouverait lui-même en insensible et serait rejeté à tort.
		if (validatedData.name !== existingColor.name) {
			const nameExists = await prisma.color.findFirst({
				where: {
					name: { equals: validatedData.name, mode: "insensitive" },
					id: { not: validatedData.id },
				},
			});

			if (nameExists) {
				return error("Ce nom de couleur existe déjà. Choisis-en un autre.");
			}
		}

		// Check hex uniqueness (skip if unchanged) — empêche les doublons
		// visuellement identiques entre 2 couleurs distinctes côté storefront.
		if (validatedData.hex !== existingColor.hex) {
			const hexExists = await prisma.color.findFirst({
				where: {
					hex: validatedData.hex,
					NOT: { id: validatedData.id },
				},
				select: { name: true },
			});

			if (hexExists) {
				return error(
					`Cette couleur (${validatedData.hex}) existe déjà sous le nom « ${hexExists.name} ».`,
				);
			}
		}

		// Update the color
		await prisma.color.update({
			where: { id: validatedData.id },
			data: {
				name: validatedData.name,
				hex: validatedData.hex,
			},
		});

		// Cascade : si name/hex change, les pages produit qui montrent cette
		// couleur (swatch + nom dans les variantes) doivent être réinvalidées.
		const nameOrHexChanged =
			validatedData.name !== existingColor.name || validatedData.hex !== existingColor.hex;

		const affectedProductSlugs: string[] = [];
		if (nameOrHexChanged) {
			const variants = await prisma.productVariant.findMany({
				where: { colorId: validatedData.id },
				select: { product: { select: { slug: true } } },
				distinct: ["productId"],
			});
			for (const v of variants) {
				if (v.product.slug) affectedProductSlugs.push(v.product.slug);
			}
		}

		// Invalidate cache
		getColorInvalidationTags({ colorId: validatedData.id, affectedProductSlugs }).forEach((tag) =>
			updateTag(tag),
		);

		return success("Couleur modifiée avec succès");
	} catch (e) {
		return handleActionError(e, "Impossible de modifier la couleur");
	}
}
