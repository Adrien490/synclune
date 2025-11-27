"use server";

import { auth } from "@/shared/lib/auth";
import { updateTag } from "next/cache";
import { getSessionInvalidationTags } from "@/modules/users/constants/cache";
import { ActionStatus } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";

/**
 * Déconnecte l'utilisateur et révoque sa session
 *
 * Bonne pratique Better Auth 2025 :
 * - TOUJOURS appeler signOut() même si l'utilisateur n'existe plus en base
 * - Ne PAS vérifier l'existence de l'utilisateur avant de déconnecter
 * - Gérer les sessions orphelines (utilisateur supprimé mais session active)
 * - Nettoyer les cookies et le cache dans tous les cas
 *
 * @returns Redirection vers la page d'accueil ou message d'erreur
 */
export async function logout() {
	try {
		// Récupérer la session SANS crash si l'utilisateur n'existe plus
		// On utilise directement l'API Better Auth au lieu de getSession()
		// car getSession() peut crash si customSession() lève une erreur
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		// Invalider le cache si on a un userId (même si l'utilisateur n'existe plus)
		// Cela permet de nettoyer le cache pour les sessions orphelines
		if (session?.user?.id) {
			try {
				getSessionInvalidationTags(session.user.id).forEach(tag => updateTag(tag));
			} catch (cacheError) {
				// Ignorer les erreurs de cache, on continue le logout
			}
		}

		// TOUJOURS appeler signOut() pour révoquer la session et nettoyer les cookies
		// Même si l'utilisateur n'existe plus en base, Better Auth peut quand même
		// supprimer la session de la table sessions et nettoyer les cookies
		await auth.api.signOut({ headers: await headers() });

		// Redirection vers l'accueil après déconnexion réussie
		redirect("/");
	} catch (error: unknown) {
		// Les erreurs de redirection Next.js doivent être propagées
		if (isRedirectError(error)) {
			throw error;
		}

		// Même en cas d'erreur, tenter de rediriger vers l'accueil
		// Car l'utilisateur a cliqué sur "se déconnecter"
		// Les cookies ont probablement été nettoyés par Better Auth
		try {
			redirect("/");
		} catch (redirectError) {
			// Si la redirection échoue aussi, retourner un message d'erreur
			return {
				status: ActionStatus.ERROR,
				message: "Une erreur est survenue lors de la déconnexion",
			};
		}
	}
}
