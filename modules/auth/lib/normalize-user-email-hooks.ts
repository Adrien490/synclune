import { normalizeEmail } from "@/shared/utils/normalize-email";

/**
 * Hooks d'adaptateur Better Auth qui normalisent `User.email` avant écriture.
 *
 * Extraits d'`auth.ts` pour la même raison que `post-login-merge.ts` : charger
 * `auth.ts` exige toute la configuration Better Auth (env, Stripe, plugins), ce qui
 * rend un test unitaire impraticable. Ici la logique est testable telle qu'exécutée.
 *
 * Pourquoi ces hooks (audit schéma 2026-07-30) — `User.email @unique` est un index
 * Postgres SENSIBLE À LA CASSE. Trois chemins écrivent la colonne : inscription
 * email/mot de passe, profil Google (`accountLinking`), et `changeEmail`. Seul le
 * premier passait par le `.toLowerCase()` de `emailSchema`. `create`/`update` de
 * l'adaptateur sont le point de passage UNIQUE des trois.
 *
 * Contrat de retour (cf. `better-auth/dist/db/with-hooks.mjs`) : `{ data }` est fusionné
 * par-dessus le payload entrant (`{ ...actualData, ...result.data }`) — on ne renvoie
 * donc que la clé corrigée. `undefined` = aucun changement. `false` annulerait
 * l'opération, ce qui n'est jamais voulu ici : on corrige, on ne rejette pas.
 */

/** Payload minimal manipulé par les hooks — seul `email` nous concerne. */
interface EmailBearingPayload {
	email?: unknown;
}

export function normalizeUserEmailOnCreate(
	user: EmailBearingPayload,
): { data: { email: string } } | undefined {
	if (typeof user.email !== "string") return undefined;
	const normalized = normalizeEmail(user.email);
	return normalized === user.email ? undefined : { data: { email: normalized } };
}

/**
 * Idem pour l'update. Le payload est PARTIEL : `email` n'est présent que sur un
 * changement d'email (`changeEmail`), et toute autre mutation d'utilisateur
 * (emailVerified, image, accountStatus…) doit passer sans être touchée.
 */
export function normalizeUserEmailOnUpdate(
	data: EmailBearingPayload,
): { data: { email: string } } | undefined {
	if (typeof data.email !== "string") return undefined;
	const normalized = normalizeEmail(data.email);
	return normalized === data.email ? undefined : { data: { email: normalized } };
}
