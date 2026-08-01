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
import { updateColorSchema } from "../schemas/color.schemas";

export async function updateColor(_prevState: unknown, formData: FormData): Promise<ActionState> {
	try {
		// 1. Admin authorization check
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLOR_LIMITS.UPDATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extract data from FormData
		const rawDescription = sanitizeText(safeFormGet(formData, "description") ?? "");
		const rawIsActive = formData.get("isActive");
		const rawData = {
			id: formData.get("id"),
			name: sanitizeText(safeFormGet(formData, "name") ?? ""),
			hex: formData.get("hex"),
			description: rawDescription.length > 0 ? rawDescription : undefined,
			isActive: rawIsActive === null ? undefined : rawIsActive === "true",
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

		// Check name uniqueness (skip if unchanged) — insensible à la casse
		// (aligné sur les types de bijoux). `id: { not }` : un rename purement
		// cosmétique (« Or rose » → « Or Rose ») se retrouverait lui-même en
		// insensible et serait rejeté à tort.
		if (validatedData.name !== existingColor.name) {
			const nameExists = await prisma.color.findFirst({
				where: {
					name: { equals: validatedData.name, mode: "insensitive" },
					id: { not: validatedData.id },
				},
			});

			if (nameExists) {
				return error("Ce nom de couleur existe deja. Veuillez en choisir un autre.");
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

		// Generate new slug if name changed.
		// `excludeId` : sans lui, un rename cosmétique (casse/accent) retrouvait
		// son PROPRE slug et suffixait `-2` — l'URL changeait sans raison.
		const slug =
			validatedData.name !== existingColor.name
				? await generateSlug(prisma, "color", validatedData.name, {
						excludeId: validatedData.id,
					})
				: existingColor.slug;

		// isActive : ne s'applique que si transmis (édition). Création force true.
		const nextIsActive = validatedData.isActive ?? existingColor.isActive;

		// Update the color
		await prisma.color.update({
			where: { id: validatedData.id },
			data: {
				name: validatedData.name,
				slug,
				hex: validatedData.hex,
				description: validatedData.description ?? null,
				isActive: nextIsActive,
			},
		});

		// Cascade : si name/hex/isActive change, les pages produit qui montrent
		// cette couleur (swatch + nom dans les SKUs) ou sa disponibilité doivent
		// être réinvalidées.
		const nameOrHexChanged =
			validatedData.name !== existingColor.name ||
			validatedData.hex !== existingColor.hex ||
			nextIsActive !== existingColor.isActive;

		const affectedProductSlugs: string[] = [];
		if (nameOrHexChanged) {
			// M2M : on cherche les SKUs actifs liés à cette couleur via la jointure
			const skus = await prisma.productSku.findMany({
				where: {
					deletedAt: null,
					colors: { some: { colorId: validatedData.id } },
				},
				select: { product: { select: { slug: true } } },
				distinct: ["productId"],
			});
			for (const s of skus) {
				if (s.product.slug) affectedProductSlugs.push(s.product.slug);
			}
		}

		// Invalidate cache — use Set to dedupe tags across the previous + new
		// slug invalidation pairs and the cross-module product cascade.
		const tagSet = new Set(
			getColorInvalidationTags({ slug: existingColor.slug, affectedProductSlugs }),
		);
		if (slug !== existingColor.slug) {
			getColorInvalidationTags({ slug, affectedProductSlugs }).forEach((t) => tagSet.add(t));
		}
		tagSet.forEach((tag) => updateTag(tag));

		return success("Couleur modifiée avec succès");
	} catch (e) {
		return handleActionError(e, "Impossible de modifier la couleur");
	}
}
