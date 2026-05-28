import {
	sendOAuthAccountLinkedEmail,
	sendPasswordResetEmail,
	sendVerificationEmail,
	sendWelcomeEmail,
} from "@/modules/emails/services/auth-emails";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { ActionStatus } from "@/shared/types/server-action";
import { AccountStatus } from "@/app/generated/prisma/client";
import { stripe } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { customSession } from "better-auth/plugins";
import Stripe from "stripe";
import {
	AUTH_PASSWORD_CONFIG,
	AUTH_RATE_LIMIT_RULES,
	AUTH_SESSION_CONFIG,
	validateAuthEnvironment,
} from "./auth-env";

// Valider les variables d'environnement au démarrage
validateAuthEnvironment();

// Initialiser Stripe client avec valeur par défaut pour le build
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: "2026-05-27.dahlia",
	maxNetworkRetries: 2,
});

export const auth = betterAuth({
	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ["google"],
		},
	},
	user: {
		// Pas d'additionalFields firstName/lastName : ces données vivent uniquement
		// sur le modèle Address (shipping/billing). Better Auth tentait un fallback join
		// sur des colonnes User inexistantes (drift schéma → erreur P2022 ColumnNotFound).
		changeEmail: {
			enabled: true,
		},
	},
	rateLimit: {
		enabled: true,
		window: 60,
		max: 100,
		customRules: AUTH_RATE_LIMIT_RULES,
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID ?? "",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
		},
	},
	emailAndPassword: {
		requireEmailVerification: true, // Validation d'email obligatoire dans tous les environnements
		enabled: true,
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
		sendOnSignUp: true, // Envoi automatique à l'inscription
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
	plugins: [
		customSession(async ({ user, session }) => {
			// Filtre les comptes bloqués : soft-deleted (deletedAt) + suspended (suspendedAt)
			// + accountStatus INACTIVE/ANONYMIZED. PENDING_DELETION reste accepté pour
			// permettre à l'utilisateur d'annuler sa demande via `cancelAccountDeletion`.
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
					accountStatus: { in: [AccountStatus.ACTIVE, AccountStatus.PENDING_DELETION] },
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
		stripe({
			stripeClient,
			stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
			createCustomerOnSignUp: true,

			// 🔴 CORRECTION : Hook appelé après création du Customer Stripe
			onCustomerCreate: async ({ stripeCustomer: _stripeCustomer, user }, _request) => {
				// Create cart and wishlist automatically on signup
				try {
					await prisma.$transaction(async (tx) => {
						// Créer le panier
						await tx.cart.create({
							data: {
								userId: user.id,
							},
						});

						// Créer la wishlist
						await tx.wishlist.create({
							data: {
								userId: user.id,
							},
						});
					});
				} catch (error) {
					// Don't block signup if cart/wishlist creation fails - they'll be created on first use (via upsert)
					logger.error("Cart/wishlist creation failed on signup", error, {
						service: "auth",
						userId: user.id,
					});
				}

				// Stripe customer events are tracked via Sentry and /api/webhooks/stripe
			},

			// 🔴 CORRECTION : Personnaliser les paramètres de création du Customer Stripe
			getCustomerCreateParams: async (user, _request) => {
				return {
					// Ajouter le nom complet si disponible
					name: user.name || user.email,

					// Métadonnées personnalisées pour faciliter le tracking
					metadata: {
						userId: user.id,
						signupDate: new Date().toISOString(),
						source: "website",
						// Ajouter d'autres métadonnées utiles pour votre business
						// referralSource: user.metadata?.referralSource,
					},

					// Optionnel : Préférence de communication
					// preferred_locales: ["fr"],
				};
			},

			// 🔴 CORRECTION : Handler global pour tous les événements Stripe (monitoring)
			onEvent: async (_event) => {
				// Stripe events are monitored via Sentry; payment events handled by /api/webhooks/stripe
			},
		}),
		nextCookies(), // IMPORTANT: doit être le dernier plugin pour gérer les cookies dans les server actions
	],
	pages: {
		error: "/error",
		signIn: "/connexion",
		signUp: "/inscription",
	},
	session: {
		expiresIn: AUTH_SESSION_CONFIG.expiresIn,
		updateAge: AUTH_SESSION_CONFIG.updateAge,
		cookieCache: AUTH_SESSION_CONFIG.cookieCache,
	},
	databaseHooks: {
		account: {
			create: {
				after: async (account) => {
					// Notification email envoyée à l'utilisateur quand un nouveau provider OAuth
					// (Google, …) est lié à son compte Synclune existant. Défense en profondeur
					// contre l'account-takeover via `trustedProviders` (Better Auth lie auto si
					// l'email matche et est vérifié provider-side).
					//
					// Skip credential (email/password — pas du linking OAuth).
					if (account.providerId === "credential") return;

					try {
						const accountCount = await prisma.account.count({
							where: { userId: account.userId },
						});

						// Si c'est le premier account du user → signup OAuth initial, pas du linking
						if (accountCount <= 1) return;

						const user = await prisma.user.findUnique({
							where: { id: account.userId },
							select: { email: true, name: true },
						});

						if (!user?.email) return;

						const providerName =
							account.providerId === "google"
								? "Google"
								: account.providerId.charAt(0).toUpperCase() + account.providerId.slice(1);

						await sendOAuthAccountLinkedEmail({
							to: user.email,
							userName: user.name ?? user.email,
							providerName,
						});
					} catch (error) {
						// Ne pas bloquer la création de l'account si l'email échoue
						logger.error("Failed to send OAuth account linked email", error, {
							service: "auth",
							userId: account.userId,
							providerId: account.providerId,
						});
					}
				},
			},
		},
	},
	hooks: {
		before: createAuthMiddleware(async (ctx) => {
			const path = ctx.path;

			// Bloquer signin email pour comptes révoqués (suspended/anonymized/deleted).
			// Réponse générique "invalid credentials" → pas d'énumération possible.
			// PENDING_DELETION + INACTIVE restent permis (peuvent se reconnecter
			// pour annuler la demande via `cancelAccountDeletion`).
			if (path === "/sign-in/email") {
				const body = ctx.body as { email?: string } | undefined;
				const email = body?.email?.toLowerCase().trim();
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

			// Security audit logging for auth-sensitive endpoints
			const isAuthAttempt =
				path === "/sign-in/email" ||
				path === "/sign-up/email" ||
				path === "/reset-password" ||
				path === "/forget-password";

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
		after: createAuthMiddleware(async (ctx) => {
			const newSession = ctx.context.newSession;

			// Send welcome email after successful email verification
			if (ctx.path === "/verify-email" && newSession?.user) {
				try {
					await sendWelcomeEmail({
						to: newSession.user.email,
						userName: newSession.user.name,
					});
				} catch {
					// Don't block verification if welcome email fails
				}
			}

			// Vérifier qu'une nouvelle session a été créée (connexion/inscription réussie)
			if (!newSession) {
				return; // Pas de nouvelle session, rien à faire
			}

			// Skip merge cart/wishlist/orders si le compte n'est pas ACTIVE.
			// Cas: un user PENDING_DELETION qui se reconnecte UNIQUEMENT pour annuler
			// sa demande (cancelAccountDeletion) ne doit pas rattacher de nouvelles
			// données (commandes guest, panier) à son compte mort.
			const accountState = await prisma.user.findUnique({
				where: { id: newSession.user.id },
				select: { accountStatus: true },
			});
			if (accountState?.accountStatus !== AccountStatus.ACTIVE) {
				return;
			}

			// Récupérer le cookie de session visiteur du panier (validation UUID v4 stricte)
			const rawCartSessionId = ctx.getCookie("cart_session");
			const { isValidCartSessionId } = await import("@/modules/cart/lib/cart-session");
			const cartSessionId = isValidCartSessionId(rawCartSessionId) ? rawCartSessionId : null;

			// 🛒 MERGE DU PANIER (import dynamique pour éviter le cycle de dépendances)
			if (cartSessionId) {
				try {
					const { mergeCarts } = await import("@/modules/cart/actions/merge-carts");
					const cartResult = await mergeCarts(newSession.user.id, cartSessionId);

					if (cartResult.status === ActionStatus.SUCCESS) {
						// ✅ Merge réussi : supprimer le cookie
						ctx.setCookie("cart_session", "", {
							maxAge: 0,
							path: "/",
						});
					}
				} catch (_error) {
					// Ignore - Cookie preserved for retry
				}
			}

			// ❤️ MERGE DE LA WISHLIST (import dynamique pour éviter le cycle de dépendances)
			const wishlistSessionId = ctx.getCookie("wishlist_session");
			const { isValidUuidV4 } = await import("@/modules/wishlist/lib/wishlist-session");
			if (wishlistSessionId && isValidUuidV4(wishlistSessionId)) {
				try {
					const { mergeWishlists } = await import("@/modules/wishlist/actions/merge-wishlists");
					const wishlistResult = await mergeWishlists(newSession.user.id, wishlistSessionId);

					if (wishlistResult.status === ActionStatus.SUCCESS) {
						// ✅ Merge réussi : supprimer le cookie
						ctx.setCookie("wishlist_session", "", {
							maxAge: 0,
							path: "/",
						});
					}
				} catch (error) {
					// Log l'erreur pour debugging mais continue (cookie preserved for retry)
					logger.error("Wishlist merge failed", error, {
						service: "auth",
						userId: newSession.user.id,
					});
				}
			}

			// 📦 LINK GUEST ORDERS (retroactive order linking by email)
			// When a guest creates an account or signs in, link their previous
			// guest orders (userId: null) to the new account by email match.
			if (newSession.user.email) {
				try {
					const { count } = await prisma.order.updateMany({
						where: {
							userId: null,
							customerEmail: newSession.user.email,
							...notDeleted,
						},
						data: {
							userId: newSession.user.id,
						},
					});

					if (count > 0) {
						// Invalidate user orders cache so they appear in the account
						const { updateTag } = await import("next/cache");
						const { ORDERS_CACHE_TAGS } = await import("@/modules/orders/constants/cache");
						updateTag(ORDERS_CACHE_TAGS.USER_ORDERS(newSession.user.id));
						updateTag(ORDERS_CACHE_TAGS.ACCOUNT_STATS(newSession.user.id));
					}
				} catch (error) {
					logger.error("Guest order linking failed", error, {
						service: "auth",
						userId: newSession.user.id,
					});
				}
			}
		}),
	},
});

export type Session = typeof auth.$Infer.Session;
