"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	requireAuth,
	enforceRateLimitForCurrentUser,
	validateInput,
	success,
	handleActionError,
} from "@/shared/lib/actions";
import { updateProfileSchema } from "../schemas/user.schemas";
import { getCurrentUserInvalidationTags } from "../constants/cache";

// Rate limit: 10 requêtes par minute
const UPDATE_PROFILE_RATE_LIMIT = { limit: 10, windowMs: 60 * 1000 };

/**
 * Server Action pour mettre à jour le profil utilisateur
 * Compatible avec useActionState de React 19
 *
 * Gère automatiquement :
 * - La validation des données
 * - La revalidation du cache
 *
 * Note: l'email n'est plus modifiable via ce formulaire
 */
export async function updateProfile(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(UPDATE_PROFILE_RATE_LIMIT);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Vérification de l'authentification
		const userAuth = await requireAuth();
		if ("error" in userAuth) return userAuth.error;

		const user = userAuth.user;

		// 3. Extraction et validation des données
		const rawData = {
			name: formData.get("name") as string,
		};

		const validation = validateInput(updateProfileSchema, rawData);
		if ("error" in validation) return validation.error;

		// 4. Mettre à jour le profil
		await prisma.user.update({
			where: { id: user.id },
			data: {
				name: validation.data.name,
			},
		});

		// 5. Revalidation du cache avec tags
		const tags = getCurrentUserInvalidationTags(user.id);
		tags.forEach((tag) => updateTag(tag));

		return success("Profil mis à jour avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la mise à jour du profil");
	}
}
