"use server";

import { ajAuth } from "@/shared/lib/arcjet";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";

/**
 * Vérifie la protection Arcjet (Shield + Bot Detection + Rate Limiting)
 * Retourne une ActionState si la requête est bloquée, null sinon
 *
 * @param endpoint - L'endpoint à protéger (ex: "/auth/sign-in")
 * @param headersList - Les headers de la requête
 * @returns ActionState si bloqué, null si autorisé
 */
export async function checkArcjetProtection(
	endpoint: string,
	headersList: Headers
): Promise<ActionState | null> {
	const request = new Request(`https://synclune.fr${endpoint}`, {
		method: "POST",
		headers: headersList,
	});

	const decision = await ajAuth.protect(request, { requested: 1 });

	if (decision.isDenied()) {
		if (decision.reason.isRateLimit()) {
			return {
				status: ActionStatus.ERROR,
				message: "Trop de tentatives. Veuillez réessayer dans 15 minutes.",
			};
		}

		if (decision.reason.isBot()) {
			return {
				status: ActionStatus.ERROR,
				message: "Votre requête a été identifiée comme automatisée.",
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
			message: "Votre requête n'a pas pu être traitée.",
		};
	}

	return null;
}
