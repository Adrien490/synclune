"use server";

import { auth } from "@/modules/auth/lib/auth";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signInSocialSchema } from "../schemas/auth.schemas";

// Interface pour typer l'erreur de redirection Next.js
interface NextRedirectError extends Error {
	digest?: string;
}

export const signInSocial = async (
	_: unknown,
	formData: FormData
): Promise<ActionState> => {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		if (session?.user?.id) {
			// console.log("⚠️ Utilisateur déjà connecté:", session.user.id);
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Vous êtes déjà connecté",
			};
		}

		const rawData = {
			provider: formData.get("provider") as string,
			callbackURL: (formData.get("callbackURL") as string) || "/",
		};

		const validation = signInSocialSchema.safeParse(rawData);
		if (!validation.success) {
			const firstError = validation.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError?.message || "Données invalides",
			};
		}

		const { provider, callbackURL } = validation.data;

		try {
			const response = await auth.api.signInSocial({
				body: {
					provider,
					callbackURL,
				},
			});

			if (!response) {
				return {
					status: ActionStatus.ERROR,
					message: "Aucune réponse du service d'authentification",
				};
			}
			if (!response.url) {
				return {
					status: ActionStatus.ERROR,
					message: "URL de redirection manquante",
				};
			}

			// console.log("✅ Redirection vers:", response.url);

			// La redirection va lancer une erreur NEXT_REDIRECT, c'est normal
			// Next.js utilise cette erreur en interne pour gérer les redirections
			redirect(response.url);
		} catch (error) {
			// Vérifier si l'erreur est liée à une redirection Next.js
			if (
				error instanceof Error &&
				(error.message === "NEXT_REDIRECT" ||
					(error as NextRedirectError).digest?.startsWith("NEXT_REDIRECT"))
			) {
				// Laisser l'erreur de redirection se propager
				throw error;
			}

			const errorMessage =
				error instanceof Error
					? error.message
					: "Une erreur est survenue lors de la connexion";

			// console.error("❌ Erreur signInSocial:", error);
			return {
				status: ActionStatus.ERROR,
				message: errorMessage,
			};
		}
	} catch (error) {
		// Vérifier si l'erreur est liée à une redirection Next.js
		if (
			error instanceof Error &&
			(error.message === "NEXT_REDIRECT" ||
				(error as NextRedirectError).digest?.startsWith("NEXT_REDIRECT"))
		) {
			// Laisser l'erreur de redirection se propager
			throw error;
		}

		const errorMessage =
			error instanceof Error
				? error.message
				: "Une erreur inattendue est survenue";

		// console.error("❌ Erreur globale:", error);
		return {
			status: ActionStatus.ERROR,
			message: errorMessage,
		};
	}
};
