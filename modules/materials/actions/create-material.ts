"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import {
	handleActionError,
	success,
	error,
	validateInput,
	safeFormGet,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_MATERIAL_LIMITS } from "@/shared/lib/rate-limit-config";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";
import { updateTag } from "next/cache";

import { getMaterialInvalidationTags } from "../constants/cache";
import { createMaterialSchema } from "../schemas/materials.schemas";

export async function createMaterial(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_MATERIAL_LIMITS.CREATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraire les donnees du FormData
		const rawData = {
			name: sanitizeText(safeFormGet(formData, "name") ?? ""),
			description: safeFormGet(formData, "description")
				? sanitizeText(safeFormGet(formData, "description")!)
				: null,
		};

		// Valider les donnees
		const validated = validateInput(createMaterialSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Verifier l'unicite du nom
		const existingName = await prisma.material.findFirst({
			where: { name: validatedData.name },
		});

		if (existingName) {
			return error("Ce nom de materiau existe deja. Veuillez en choisir un autre.");
		}

		// Generer un slug unique automatiquement
		const slug = await generateSlug(prisma, "material", validatedData.name);

		// Creer le materiau
		const created = await prisma.material.create({
			data: {
				name: validatedData.name,
				slug,
				description: validatedData.description,
			},
		});

		// Invalider le cache
		const tags = getMaterialInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		return success("Matériau créé avec succès", { id: created.id, name: created.name });
	} catch (e) {
		// Race TOC: même si le pre-check passe, deux créations concurrentes peuvent violer
		// la contrainte `@unique` sur `name` au niveau DB. On retourne un message clair.
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
			return error("Ce nom de materiau existe deja. Veuillez en choisir un autre.");
		}
		return handleActionError(e, "Une erreur est survenue lors de la création du matériau");
	}
}
