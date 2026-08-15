"use server";

import { updateTag } from "next/cache";

import { Prisma } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import {
	handleActionError,
	success,
	error,
	validateInput,
	safeFormGet,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";

import { getMaterialInvalidationTags } from "../constants/cache";
import { updateMaterialSchema } from "../schemas/materials.schemas";

export async function updateMaterial(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 2. Extraire les donnees du FormData
		const rawData = {
			id: formData.get("id"),
			name: sanitizeText(safeFormGet(formData, "name") ?? ""),
		};

		// Valider les donnees
		const validated = validateInput(updateMaterialSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Verifier que le materiau existe
		const existingMaterial = await prisma.material.findUnique({
			where: { id: validatedData.id },
		});

		if (!existingMaterial) {
			return error("Ce matériau n'existe pas");
		}

		// Verifier l'unicite du nom (sauf si c'est le meme) — insensible à la
		// casse (aligné sur les types de bijoux). `id: { not }` : un rename
		// purement cosmétique se retrouverait lui-même en insensible et serait
		// rejeté à tort.
		if (validatedData.name !== existingMaterial.name) {
			const nameExists = await prisma.material.findFirst({
				where: {
					name: { equals: validatedData.name, mode: "insensitive" },
					id: { not: validatedData.id },
				},
			});

			if (nameExists) {
				return error("Ce nom de matériau existe déjà. Choisis-en un autre.");
			}
		}

		// Mettre a jour le materiau
		await prisma.material.update({
			where: { id: validatedData.id },
			data: {
				name: validatedData.name,
			},
		});

		// Cascade : si le nom change, les PDP storefront affichant ce matériau
		// dans les badges variante doivent être réinvalidés.
		const nameChanged = validatedData.name !== existingMaterial.name;
		const affectedProductSlugs: string[] = [];
		if (nameChanged) {
			const variants = await prisma.productVariant.findMany({
				where: { materialId: validatedData.id },
				select: { product: { select: { slug: true } } },
				distinct: ["productId"],
			});
			for (const v of variants) {
				if (v.product.slug) affectedProductSlugs.push(v.product.slug);
			}
		}

		// Invalider le cache
		getMaterialInvalidationTags({ materialId: validatedData.id, affectedProductSlugs }).forEach(
			(tag) => updateTag(tag),
		);

		return success("Matériau modifié avec succès");
	} catch (e) {
		// Race TOC: même si le pre-check passe, deux mises à jour concurrentes peuvent
		// violer la contrainte `@unique` sur `name`. Message aligné avec le pre-check.
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
			return error("Ce nom de matériau existe déjà. Choisis-en un autre.");
		}
		return handleActionError(e, "Impossible de modifier le matériau");
	}
}
