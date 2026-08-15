"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { handleActionError, success, validateInput } from "@/shared/lib/actions";
import { logger } from "@/shared/lib/logger";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import {
	ADMIN_SESSION_COOKIE,
	ADMIN_SESSION_DURATION_MS,
} from "@/modules/admin-auth/constants/admin-auth.constants";
import { signSessionToken } from "@/modules/admin-auth/lib/session-token";
import { shouldUseSecureCookies } from "@/shared/lib/cookie-security";

const loginSchema = z.object({
	// Longueur bornée : le mot de passe n'est jamais persisté, mais un payload
	// arbitraire ne doit pas atteindre la comparaison HMAC.
	password: z.string().min(1, "Le mot de passe est requis").max(256, "Mot de passe trop long"),
});

/**
 * Compare le mot de passe soumis au secret en temps constant.
 *
 * `timingSafeEqual` exige des buffers de même longueur — comparer les HMAC des
 * deux valeurs (clé fixe) donne des longueurs égales SANS révéler la longueur
 * du mot de passe attendu par le chemin d'erreur.
 */
function passwordMatches(submitted: string, expected: string): boolean {
	const key = "synclune-admin-login";
	const submittedHmac = createHmac("sha256", key).update(submitted).digest();
	const expectedHmac = createHmac("sha256", key).update(expected).digest();
	return timingSafeEqual(submittedHmac, expectedHmac);
}

/**
 * Connexion de l'administratrice — la SEULE authentification de l'application
 * (décision D3, docs/MIGRATION-PROMPTS.md).
 *
 * Vérifie `ADMIN_PASSWORD` (env) en temps constant, puis pose le cookie
 * `admin_session` signé HMAC (`AUTH_SECRET`), httpOnly + secure + sameSite=lax,
 * valable 7 jours. La redirection est laissée au client (hook du formulaire).
 */
export async function login(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// Rate limiting retiré (migration lean §1) : la protection restante est la
		// comparaison à temps constant + le mot de passe fort.

		// 2. Validation
		const validation = validateInput(loginSchema, {
			password: formData.get("password"),
		});
		if ("error" in validation) return validation.error;

		// 3. Secrets d'environnement — fail-closed si absents
		const adminPassword = process.env.ADMIN_PASSWORD;
		const authSecret = process.env.AUTH_SECRET;
		if (!adminPassword || !authSecret) {
			logger.error("ADMIN_PASSWORD ou AUTH_SECRET manquant — connexion impossible", {
				service: "admin-auth",
			});
			return {
				status: ActionStatus.ERROR,
				message: "Configuration d'authentification incomplète.",
			};
		}

		// 4. Comparaison à temps constant
		if (!passwordMatches(validation.data.password, adminPassword)) {
			logger.warn("Failed admin login attempt", { service: "admin-auth" });
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Mot de passe incorrect.",
			};
		}

		// 5. Pose du cookie signé
		const expiresAtMs = Date.now() + ADMIN_SESSION_DURATION_MS;
		const cookieStore = await cookies();
		cookieStore.set(ADMIN_SESSION_COOKIE, signSessionToken(expiresAtMs, authSecret), {
			httpOnly: true,
			secure: shouldUseSecureCookies(), // SSOT — cf. shared/lib/cookie-security.ts
			sameSite: "lax",
			path: "/",
			expires: new Date(expiresAtMs),
		});

		return success("Connexion réussie");
	} catch (err) {
		return handleActionError(err, "Une erreur est survenue lors de la connexion", {
			service: "admin-auth",
		});
	}
}
