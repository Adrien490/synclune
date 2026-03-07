"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import {
	handleActionError,
	success,
	error,
	notFound,
	validateInput,
	safeFormGet,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_MATERIAL_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";

import { getMaterialInvalidationTags } from "../constants/cache";
import { duplicateMaterialSchema } from "../schemas/materials.schemas";

/**
 * Server Action ADMIN pour dupliquer un materiau
 *
 * Cree une copie du materiau avec:
 * - Un nouveau nom (original + " (copie)" ou " (copie N)")
 * - Un nouveau slug genere automatiquement
 * - isActive a false (pour eviter activation accidentelle)
 */
export async function duplicateMaterial(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verification admin
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_MATERIAL_LIMITS.DUPLICATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Validation des donnees
		const rawData = {
			materialId: safeFormGet(formData, "materialId"),
		};

		const validated = validateInput(duplicateMaterialSchema, rawData);
		if ("error" in validated) return validated.error;
		const { materialId } = validated.data;

		// 4. Recuperer le materiau original
		const original = await prisma.material.findUnique({
			where: { id: materialId },
		});

		if (!original) {
			return notFound("Materiau");
		}

		// 5. Generer un nouveau nom unique
		const baseCopyName = `${original.name} (copie`;
		const existingCopies = await prisma.material.findMany({
			where: { name: { startsWith: baseCopyName } },
			select: { name: true },
		});

		let newName: string;
		if (existingCopies.length === 0) {
			newName = `${original.name} (copie)`;
		} else {
			const existingNames = new Set(existingCopies.map((m) => m.name));
			// Check if "(copie)" is available
			if (!existingNames.has(`${original.name} (copie)`)) {
				newName = `${original.name} (copie)`;
			} else {
				// Find the next available suffix
				let suffix = 2;
				while (existingNames.has(`${original.name} (copie ${suffix})`) && suffix <= 100) {
					suffix++;
				}
				if (suffix > 100) {
					return error("Impossible de generer un nom unique. Supprimez certaines copies.");
				}
				newName = `${original.name} (copie ${suffix})`;
			}
		}

		// 6. Generer un slug unique
		const slug = await generateSlug(prisma, "material", newName);

		// 7. Creer la copie
		const duplicate = await prisma.material.create({
			data: {
				name: newName,
				slug,
				description: original.description,
				isActive: false, // Desactive par defaut
			},
		});

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "material.duplicate",
			targetType: "material",
			targetId: duplicate.id,
			metadata: { originalId: materialId, name: duplicate.name },
		});

		// 8. Invalider le cache
		const tags = getMaterialInvalidationTags(duplicate.slug);
		tags.forEach((tag) => updateTag(tag));

		return success(`Materiau duplique: ${duplicate.name}`, {
			id: duplicate.id,
			name: duplicate.name,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de dupliquer le materiau");
	}
}
