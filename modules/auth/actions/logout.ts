"use server";

import { auth } from "@/modules/auth/lib/auth";
import { handleActionError, success } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
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

		// Pas d'invalidation de cache nécessaire : les entrées "use cache: private"
		// sont scopées par cookies de session, invalidées de fait par le signOut
		// Révoquer la session et nettoyer les cookies
		await auth.api.signOut({ headers: headersList });

		return success("Déconnexion réussie");
	} catch (err) {
		return handleActionError(err, "Une erreur est survenue lors de la déconnexion", {
			service: "logout",
		});
	}
}
