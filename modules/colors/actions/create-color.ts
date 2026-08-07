"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLOR_LIMITS } from "@/shared/lib/rate-limit-config";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";

import { getColorInvalidationTags } from "../constants/cache";
import { createColorSchema } from "../schemas/color.schemas";

export async function createColor(_prevState: unknown, formData: FormData): Promise<ActionState> {
	try {
		// 1. Admin authorization check
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLOR_LIMITS.CREATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extract data from FormData
		const rawDescription = sanitizeText(safeFormGet(formData, "description") ?? "");
		const rawData = {
			name: sanitizeText(safeFormGet(formData, "name") ?? ""),
			hex: formData.get("hex"),
			description: rawDescription.length > 0 ? rawDescription : undefined,
		};

		// Validate data
		const validated = validateInput(createColorSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Check name uniqueness — insensible à la casse (aligné sur les types de
		// bijoux) : « Or rose » et « Or Rose » seraient deux entrées identiques
		// dans le select SKU.
		const existingName = await prisma.color.findFirst({
			where: { name: { equals: validatedData.name, mode: "insensitive" } },
		});

		if (existingName) {
			return error("Ce nom de couleur existe déjà. Choisis-en un autre.");
		}

		// Check hex uniqueness — empêche les doublons visuellement identiques
		// (ex: "Doré" et "Or jaune 18K" partageant #D4AF37 produiraient des SKUs
		// avec pastilles strictement identiques en boutique).
		const existingHex = await prisma.color.findFirst({
			where: { hex: validatedData.hex },
			select: { name: true },
		});

		if (existingHex) {
			return error(
				`Cette couleur (${validatedData.hex}) existe déjà sous le nom « ${existingHex.name} ».`,
			);
		}

		// Generate unique slug automatically
		const slug = await generateSlug(prisma, "color", validatedData.name);

		// Create the color
		const created = await prisma.color.create({
			data: {
				name: validatedData.name,
				slug,
				hex: validatedData.hex,
				description: validatedData.description ?? null,
				isActive: true,
			},
		});

		// Invalidate cache
		const tags = getColorInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		return success("Couleur créée avec succès", {
			id: created.id,
			name: created.name,
			hex: created.hex,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de créer la couleur");
	}
}
