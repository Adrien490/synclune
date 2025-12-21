"use server";

import { auth } from "@/modules/auth/lib/auth";
import { getSessionInvalidationTags } from "@/modules/users/constants/cache";
import { error, success } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { headers } from "next/headers";

/**
 * Déconnecte l'utilisateur et révoque sa session
 *
 * Bonne pratique Better Auth 2025 :
 * - TOUJOURS appeler signOut() même si l'utilisateur n'existe plus en base
 * - Ne PAS vérifier l'existence de l'utilisateur avant de déconnecter
 * - Gérer les sessions orphelines (utilisateur supprimé mais session active)
 * - Nettoyer les cookies et le cache dans tous les cas
 */
export async function logout(): Promise<ActionState> {
	try {
		const headersList = await headers();
		const session = await auth.api.getSession({ headers: headersList });

		// Invalider le cache si on a un userId (même si l'utilisateur n'existe plus)
		if (session?.user?.id) {
			try {
				getSessionInvalidationTags(session.user.id).forEach((tag) => updateTag(tag));
			} catch {
				// Ignorer les erreurs de cache, on continue le logout
			}
		}

		// Révoquer la session et nettoyer les cookies
		await auth.api.signOut({ headers: headersList });

		return success("Déconnexion réussie");
	} catch {
		return error("Une erreur est survenue lors de la déconnexion");
	}
}
