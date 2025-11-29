"use server";

import { auth } from "@/modules/auth/lib/auth";
import { ajAuth } from "@/shared/lib/arcjet";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signInEmailSchema } from "../schemas/auth.schemas";

export const signInEmail = async (
	_: ActionState | null,
	formData: FormData
): Promise<ActionState> => {
	try {
		const headersList = await headers();

		// 🛡️ Protection Arcjet : Shield + Bot Detection + Rate Limiting
		// Protection contre brute-force, bots, et attaques courantes
		const request = new Request("https://synclune.fr/auth/signin", {
			method: "POST",
			headers: headersList,
		});

		const decision = await ajAuth.protect(request, { requested: 1 });

		// Bloquer si Arcjet détecte une menace
		if (decision.isDenied()) {
			if (decision.reason.isRateLimit()) {
				return {
					status: ActionStatus.ERROR,
					message:
						"Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes 🔒",
				};
			}

			if (decision.reason.isBot()) {
				return {
					status: ActionStatus.ERROR,
					message:
						"Votre requête a été identifiée comme automatisée. Veuillez réessayer.",
				};
			}

			if (decision.reason.isShield()) {
				return {
					status: ActionStatus.ERROR,
					message: "Requête bloquée pour des raisons de sécurité.",
				};
			}

			return {
				status: ActionStatus.ERROR,
				message: "Votre requête n'a pas pu être traitée. Veuillez réessayer.",
			};
		}

		// Vérifier si l'utilisateur est déjà connecté
		const session = await auth.api.getSession({
			headers: headersList,
		});
		if (session?.user?.id) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Vous êtes déjà connecté",
			};
		}

		const rawData = {
			email: formData.get("email") as string,
			password: formData.get("password") as string,
			callbackURL: formData.get("callbackURL") as string,
		};

		const validation = signInEmailSchema.safeParse(rawData);
		if (!validation.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Données invalides",
			};
		}

		const { email, password, callbackURL } = validation.data;

		// Better Auth lance une exception APIError en cas d'erreur d'authentification
		const response = await auth.api.signInEmail({
			body: {
				email,
				password,
				callbackURL,
			},
			headers: await headers(),
		});

		// Vérifier si la réponse est valide
		if (!response) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune réponse du service d'authentification",
			};
		}

		// Si la connexion est réussie, effectuer la redirection
		redirect(callbackURL);
	} catch (error: unknown) {
		// Les erreurs de redirection Next.js doivent être propagées
		if (isRedirectError(error)) {
			throw error;
		}

		// Capturer les erreurs d'authentification de Better Auth
		if (error instanceof Error) {
			const errorMessage = error.message.toLowerCase();

			// Email ou mot de passe invalide
			if (errorMessage.includes("invalid email or password")) {
				return {
					status: ActionStatus.UNAUTHORIZED,
					message: "Email ou mot de passe incorrect",
				};
			}

			// Email non vérifié (en production)
			if (
				errorMessage.includes("email") &&
				errorMessage.includes("not verified")
			) {
				return {
					status: ActionStatus.ERROR,
					message:
						"Votre email n'a pas été vérifié. Veuillez vérifier votre boîte mail ou renvoyer l'email de vérification.",
				};
			}
		}

		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de la connexion",
		};
	}
};
