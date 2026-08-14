"use server";

import { updateTag } from "next/cache";

import { Prisma } from "@/app/generated/prisma/client";
import { enforceRateLimitForCurrentUser } from "@/modules/admin-auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import {
	validateInput,
	handleActionError,
	success,
	error,
	BusinessError,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLOR_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getColorInvalidationTags } from "../constants/cache";
import { deleteColorSchema } from "../schemas/color.schemas";

export async function deleteColor(_prevState: unknown, formData: FormData): Promise<ActionState> {
	try {
		// 1. Admin authorization check
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLOR_LIMITS.DELETE);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extract data from FormData
		const rawData = {
			id: formData.get("id"),
		};

		// Validate data
		const validated = validateInput(deleteColorSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Check existence + SKU usage and delete atomically.
		// La FK ProductSkuColor.colorId est en ON DELETE RESTRICT (cf. migration
		// 20260515181712_add_sku_colors_m2m) : le delete lèverait P2003 si un SKU
		// concurrent est créé entre le count et le delete. La pré-vérification reste
		// pour produire un message UI lisible avant d'atteindre la contrainte DB.
		const existingColor = await prisma.$transaction(async (tx) => {
			const color = await tx.color.findUnique({
				where: { id: validatedData.id },
				include: {
					_count: {
						select: {
							// Ne compter que les variantes VIVANTES : un lien porte par un SKU
							// soft-deleted (produit supprime) renvoyait « utilisee par N
							// variante(s) » vers des variantes invisibles dans l'admin, rendant
							// la couleur indelebile a jamais. Le vrai garde-fou reste la FK
							// `ON DELETE RESTRICT`, rattrapee en P2003 plus bas.
							skuColors: { where: { sku: { deletedAt: null } } },
						},
					},
				},
			});

			if (!color) return null;

			const skuCount = color._count.skuColors;
			if (skuCount > 0) {
				throw new BusinessError(
					`Cette couleur est utilisee par ${skuCount} variante${skuCount > 1 ? "s" : ""}. Veuillez modifier ces variantes avant de supprimer la couleur.`,
				);
			}

			await tx.color.delete({
				where: { id: validatedData.id },
			});

			return color;
		});

		if (!existingColor) {
			return error("Cette couleur n'existe pas");
		}

		// Invalidate cache
		const tags = getColorInvalidationTags(existingColor.slug);
		tags.forEach((tag) => updateTag(tag));

		return success("Couleur supprimée avec succès");
	} catch (e) {
		// P2003 : violation FK Restrict. Deux causes possibles — un SKU cree en
		// concurrence apres la pre-verification, ou un lien porte par une variante
		// soft-deleted (le pre-check les ignore desormais, la FK non). Message
		// explicite sur le second cas, sinon l'admin cherche une variante fantome.
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
			return error(
				"Cette couleur reste rattachée à au moins une variante (éventuellement celle d'un bijou supprimé). Elle ne peut pas être supprimée — désactivez-la pour la retirer des choix proposés.",
			);
		}
		return handleActionError(e, "Impossible de supprimer la couleur");
	}
}
