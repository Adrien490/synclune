"use server";

import { prisma } from "@/shared/lib/prisma";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { updateTag } from "next/cache";
import { getCurrentUserInvalidationTags } from "../constants/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { updateProfileSchema } from "../schemas/user.schemas";
import { USER_ERROR_MESSAGES } from "@/modules/users/constants/profile";

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
		// 1. Vérification de l'authentification
		const user = await getCurrentUser();

		if (!user) {
			return {
				status: ActionStatus.ERROR,
				message: USER_ERROR_MESSAGES.NOT_AUTHENTICATED,
			};
		}

		// 2. Extraction des données du FormData
		const rawData = {
			name: formData.get("name") as string,
		};

		// 3. Validation avec Zod
		const result = updateProfileSchema.safeParse(rawData);
		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError?.message || "Données invalides",
			};
		}

		const validatedData = result.data;

		// 4. Mettre à jour le profil
		await prisma.user.update({
			where: { id: user.id },
			data: {
				name: validatedData.name,
			},
		});

		// 5. Revalidation du cache avec tags
		getCurrentUserInvalidationTags(user.id).forEach(tag => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: "Profil mis à jour avec succès",
		};
	} catch (error) {
// console.error("Error updating profile:", error);
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: USER_ERROR_MESSAGES.UPDATE_FAILED,
		};
	}
}
