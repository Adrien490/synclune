import {
	sendPasswordResetEmail,
	sendVerificationEmail,
} from "@/modules/emails/services/auth-emails";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { normalizeEmail } from "@/shared/utils/normalize-email";
import { AccountStatus } from "@/app/generated/prisma/client";
import {
	normalizeUserEmailOnCreate,
	normalizeUserEmailOnUpdate,
} from "./normalize-user-email-hooks";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { customSession } from "better-auth/plugins";
import {
	AUTH_PASSWORD_CONFIG,
	AUTH_RATE_LIMIT_RULES,
	AUTH_SESSION_CONFIG,
	validateAuthEnvironment,
} from "./auth-env";

// Valider les variables d'environnement au démarrage
validateAuthEnvironment();

/**
 * Authentification **réservée à l'administratrice** (retrait de l'espace client
 * 2026-07-31). Il n'y a plus de compte client : le panier, les favoris, le
 * checkout et le suivi de commande fonctionnent tous en invité (cookie de
 * session / token HMAC). `/connexion` n'existe donc plus que pour accéder à
 * `/admin`.
 *
 * Trois conséquences sur cette configuration :
 *
 * 1. `disableSignUp: true` — plus aucune création de compte par l'API. La route
 *    `/inscription` et le formulaire ont été supprimés, mais couper l'UI ne
 *    ferme pas l'endpoint `/sign-up/email` : ce flag, lui, le ferme.
 * 2. Plus de `socialProviders` — Google était un chemin d'inscription à part
 *    entière (un compte est créé au premier login OAuth), donc incompatible
 *    avec « inscription désactivée ». Il part avec `accountLinking`, dont les
 *    `trustedProviders` n'ont plus d'objet.
 * 3. Plus de plugin `@better-auth/stripe` — il n'existait que pour
 *    `createCustomerOnSignUp` et son `onCustomerCreate` qui créait le panier et
 *    la wishlist du nouvel inscrit. Le Customer Stripe du checkout est géré
 *    ailleurs, par `payments/services/stripe-customer.service.ts`.
 *
 * ⚠️ Créer un nouvel administrateur passe désormais par `prisma/seed.ts` ou par
 * la base — pas par l'application. C'est assumé (opératrice unique).
 *
 * La vérification d'email est **conservée** : `requireEmailVerification: true`
 * bloque la connexion d'un compte non vérifié, donc retirer l'envoi du mail et
 * les pages `/verifier-email` + `/renvoyer-verification` laisserait un admin
 * fraîchement créé sans aucun moyen de débloquer son propre accès.
 */
export const auth = betterAuth({
	user: {
		// Pas d'additionalFields firstName/lastName : ces données vivent uniquement
		// sur les snapshots d'adresse de la commande. Better Auth tentait un fallback
		// join sur des colonnes User inexistantes (drift schéma → P2022 ColumnNotFound).
		//
		// Pas de `changeEmail` non plus : c'était une surface de l'espace client
		// (`/parametres`), et l'admin change son email en base.
	},
	rateLimit: {
		enabled: true,
		window: 60,
		max: 100,
		customRules: AUTH_RATE_LIMIT_RULES,
	},
	emailAndPassword: {
		requireEmailVerification: true, // Validation d'email obligatoire dans tous les environnements
		enabled: true,
		// Ferme `/sign-up/email` au niveau de l'API, pas seulement de l'UI.
		disableSignUp: true,
		sendResetPassword: async ({ user, url }) => {
			// Better Auth génère automatiquement l'URL avec /api/auth/reset-password/{token}?callbackURL=...
			// On envoie cette URL directement dans l'email
			try {
				await sendPasswordResetEmail({
					to: user.email,
					url,
				});
			} catch (error) {
				logger.error("Failed to send password reset email", error, { service: "auth" });
			}
		},
		resetPasswordTokenExpiresIn: AUTH_PASSWORD_CONFIG.resetTokenExpiresIn,
		minPasswordLength: AUTH_PASSWORD_CONFIG.minLength,
		maxPasswordLength: AUTH_PASSWORD_CONFIG.maxLength,
	},
	emailVerification: {
		sendVerificationEmail: async ({ user, url, token }) => {
			// Créer l'URL qui pointe directement vers notre page de vérification
			// avec le token en paramètre. La page appellera ensuite l'API Better Auth
			const urlObj = new URL(url);
			const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
			const verificationUrl = `${baseUrl}/verifier-email?token=${token}`;

			try {
				await sendVerificationEmail({
					to: user.email,
					url: verificationUrl,
				});
			} catch (error) {
				logger.error("Failed to send verification email", error, { service: "auth" });
			}
		},
		// Pas de `sendOnSignUp` : il n'y a plus d'inscription. L'envoi passe
		// désormais uniquement par `/renvoyer-verification` (action
		// `resendVerificationEmail`), le seul déblocage possible d'un compte admin
		// non vérifié.
		autoSignInAfterVerification: true, // Auto-login after email verification to reduce friction
	},

	secret: process.env.BETTER_AUTH_SECRET,
	baseUrl: process.env.BETTER_AUTH_URL,
	// Whitelist explicite des origines acceptées (CSRF / OAuth callbacks / reset URLs).
	// Fallback inclut l'URL preview Vercel pour ne pas casser les PR builds.
	trustedOrigins: [
		process.env.BETTER_AUTH_URL ?? "",
		...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
		...(process.env.VERCEL_BRANCH_URL ? [`https://${process.env.VERCEL_BRANCH_URL}`] : []),
	].filter(Boolean),
	advanced: {
		// Force cookies HTTPS + HttpOnly + SameSite=Lax en prod. Dev: HTTPS désactivé.
		useSecureCookies: process.env.NODE_ENV === "production",
		defaultCookieAttributes: {
			sameSite: "lax",
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
		},
	},
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	/**
	 * Normalisation de `User.email` (audit schéma 2026-07-30).
	 *
	 * `User.email @unique` est un index Postgres SENSIBLE À LA CASSE : sans
	 * normalisation, `Alice@x.com` et `alice@x.com` sont deux comptes distincts.
	 * Le coût réel n'est pas le doublon — c'est le garde `hooks.before` sur
	 * `/sign-in/email` ci-dessous, qui minuscule l'entrée puis interroge
	 * `prisma.user.findFirst({ where: { email } })` en comparaison EXACTE : une ligne
	 * stockée en casse mixte fait échouer EN SILENCE le blocage des comptes
	 * suspendus / anonymisés / supprimés.
	 *
	 * ⚠️ **Conservés malgré `disableSignUp`** (retrait de l'espace client
	 * 2026-07-31). Les trois chemins d'écriture d'origine — inscription, profil
	 * Google, `changeEmail` — ont tous disparu, donc ces hooks ne sont plus sur un
	 * chemin chaud. Ils restent parce que le garde de `/sign-in/email` en dépend :
	 * il compare en casse exacte, et c'est cette normalisation qui rend la
	 * comparaison fiable. Les retirer rendrait ce garde silencieusement faux dès
	 * qu'une ligne serait écrite en casse mixte par un autre chemin (seed, SQL
	 * manuel, futur provider).
	 *
	 * Contrepartie côté base : `User_email_lowercase` (CHECK) + `User_email_lower_key`
	 * (index unique d'expression) dans `prisma/sql/raw-guards.sql`.
	 */
	databaseHooks: {
		user: {
			create: { before: async (user) => normalizeUserEmailOnCreate(user) },
			update: { before: async (data) => normalizeUserEmailOnUpdate(data) },
		},
	},
	plugins: [
		customSession(async ({ user, session }) => {
			// Filtre les comptes bloqués : soft-deleted (deletedAt) + suspended (suspendedAt)
			// + accountStatus INACTIVE/ANONYMIZED. (PENDING_DELETION, jadis toléré ici
			// pour la période de grâce RGPD, a été purgé au Lot 0 — migration 20260803.)
			//
			// ⚠️ DÉFENSE EN PROFONDEUR — Ne pas se reposer uniquement sur cette dégradation.
			// `requireAuth()` / `requireAdmin*()` (modules/auth/lib/require-auth.ts) re-checkent
			// strictement `accountStatus = ACTIVE` (filtre `fetchUserForAuth`) avant toute action
			// sensible. Le fallback `role: USER` ci-dessous existe uniquement pour permettre le
			// logout button d'un compte révoqué (sinon Better Auth peut crash).
			const userData = await prisma.user.findUnique({
				where: {
					id: session.userId,
					...notDeleted,
					suspendedAt: null,
					accountStatus: AccountStatus.ACTIVE,
				},
				select: { role: true },
			});

			if (!userData) {
				return {
					user: {
						...user,
						role: "USER" as const,
					},
					session,
				};
			}

			return {
				user: {
					...user,
					role: userData.role,
				},
				session,
			};
		}),
		nextCookies(), // IMPORTANT: doit être le dernier plugin pour gérer les cookies dans les server actions
	],
	pages: {
		error: "/error",
		signIn: "/connexion",
		// Pas de `signUp` : la route `/inscription` n'existe plus.
	},
	session: {
		expiresIn: AUTH_SESSION_CONFIG.expiresIn,
		updateAge: AUTH_SESSION_CONFIG.updateAge,
		cookieCache: AUTH_SESSION_CONFIG.cookieCache,
	},
	hooks: {
		before: createAuthMiddleware(async (ctx) => {
			const path = ctx.path;

			// Bloquer signin email pour comptes révoqués (suspended/anonymized/deleted).
			// Réponse générique "invalid credentials" → pas d'énumération possible.
			//
			// `INACTIVE` reste permis : aucun chemin applicatif ne pose plus ce statut,
			// donc seule une ligne héritée peut le porter, et le plugin `customSession`
			// dégrade de toute façon un compte non-ACTIVE au rôle `USER`. Le bloquer
			// ici n'ajouterait rien et fermerait la porte à un compte récupérable.
			// (PENDING_DELETION a été purgé au Lot 0 — lignes basculées sur INACTIVE.)
			if (path === "/sign-in/email") {
				const body = ctx.body as { email?: string } | undefined;
				// Même normalisation que `databaseHooks` ci-dessus : c'est ce qui rend
				// cette comparaison exacte fiable (cf. User_email_lowercase en base).
				const email = body?.email ? normalizeEmail(body.email) : undefined;
				if (email) {
					const blockedUser = await prisma.user.findFirst({
						where: {
							email,
							OR: [
								{ deletedAt: { not: null } },
								{ suspendedAt: { not: null } },
								{ accountStatus: AccountStatus.ANONYMIZED },
							],
						},
						select: { id: true, accountStatus: true, suspendedAt: true, deletedAt: true },
					});
					if (blockedUser) {
						logger.warn("Sign-in blocked: revoked account", {
							service: "auth",
							userId: blockedUser.id,
							accountStatus: blockedUser.accountStatus,
							suspended: blockedUser.suspendedAt !== null,
							deleted: blockedUser.deletedAt !== null,
						});
						throw new APIError("UNAUTHORIZED", {
							message: "Invalid email or password",
						});
					}
				}
			}

			// Security audit logging for auth-sensitive endpoints.
			// `/sign-up/email` n'y figure plus : `disableSignUp` le rejette avant
			// d'arriver ici, et l'y garder suggérerait un chemin d'inscription vivant.
			const isAuthAttempt =
				path === "/sign-in/email" || path === "/reset-password" || path === "/forget-password";

			if (isAuthAttempt) {
				const ip =
					ctx.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
					ctx.headers?.get("x-real-ip") ??
					"unknown";
				logger.warn("Auth attempt detected", {
					service: "auth",
					route: path,
					ip,
				});
			}
		}),
		// Pas de `hooks.after` : il ne portait que `handlePostLoginMerges` (merge du
		// panier et de la wishlist invités dans ceux du compte + rattachement des
		// commandes guest par email). Sans compte client, il n'y a plus rien à
		// rattacher — les données invitées RESTENT invitées.
	},
});

export type Session = typeof auth.$Infer.Session;
