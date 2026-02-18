import { sendPasswordChangedEmail, sendPasswordResetEmail, sendVerificationEmail } from "@/modules/emails/services/auth-emails";
import { prisma } from "@/shared/lib/prisma";
import { ActionStatus } from "@/shared/types/server-action";
import { stripe } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
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
	apiVersion: "2026-01-28.clover",
	maxNetworkRetries: 2,
});

export const auth = betterAuth({
	user: {
		additionalFields: {
			firstName: {
				type: "string",
				required: false, // Optionnel pour permettre Google OAuth
				input: true,
			},
			lastName: {
				type: "string",
				required: false, // Optionnel pour permettre Google OAuth
				input: true,
			},
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
			clientId: process.env.GOOGLE_CLIENT_ID || "",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
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
				console.error("[AUTH] Failed to send password reset email:", error)
			}
		},
		onPasswordReset: async ({ user }) => {
			try {
				const changeDate = new Intl.DateTimeFormat("fr-FR", {
					dateStyle: "long",
					timeStyle: "short",
				}).format(new Date());

				await sendPasswordChangedEmail({
					to: user.email,
					userName: user.name ?? user.email,
					changeDate,
				});
			} catch {
				// Don't block reset if email sending fails
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
				console.error("[AUTH] Failed to send verification email:", error)
			}
		},
		sendOnSignUp: true, // Envoi automatique à l'inscription
		autoSignInAfterVerification: false, // Pas de connexion automatique après validation - l'utilisateur doit se connecter manuellement
	},

	secret: process.env.BETTER_AUTH_SECRET,
	baseUrl: process.env.BETTER_AUTH_URL,
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	plugins: [
		customSession(async ({ user, session }) => {
			// Récupérer les informations utilisateur complètes depuis la base de données
			// Filter out soft-deleted users to prevent deleted accounts from retaining their role
			const userData = await prisma.user.findUnique({
				where: { id: session.userId, deletedAt: null },
				select: { role: true },
			});

			// Si l'utilisateur n'existe plus en base (compte supprimé), permettre quand même
			// le logout en retournant une session avec un rôle par défaut
			// Bonne pratique : Ne JAMAIS bloquer le logout, même pour une session orpheline
			if (!userData) {
				// Retourner la session avec un rôle par défaut pour permettre le logout
				// L'utilisateur sera automatiquement redirigé vers la page de connexion
				// lors de sa prochaine tentative d'accès à une page protégée
				return {
					user: {
						...user,
						role: "USER" as const, // Rôle par défaut pour session orpheline
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
			stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
			createCustomerOnSignUp: true,

			// 🔴 CORRECTION : Hook appelé après création du Customer Stripe
			onCustomerCreate: async ({ stripeCustomer, user }, request) => {
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
					console.error("[AUTH] Cart/wishlist creation failed on signup:", error);
				}

				// TODO: Optionnel - Envoyer un email de bienvenue
				// await sendWelcomeEmail(user.email);

				// TODO: Optionnel - Logger dans un système de monitoring (Sentry, Datadog, etc.)
				// await analytics.track('stripe_customer_created', {
				//   userId: user.id,
				//   stripeCustomerId: stripeCustomer.id
				// });
			},

			// 🔴 CORRECTION : Personnaliser les paramètres de création du Customer Stripe
			getCustomerCreateParams: async (user, request) => {
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
			onEvent: async (event) => {

				// TODO: Optionnel - Envoyer à un système de monitoring
				// if (process.env.NODE_ENV === "production") {
				//   await monitoring.logEvent('stripe_webhook_received', {
				//     type: event.type,
				//     id: event.id,
				//     created: event.created
				//   });
				// }

				// Les événements de paiement sont gérés par /api/webhooks/stripe
				// Ce hook est principalement pour le monitoring et les événements customer
			},
		}),
		nextCookies(), // IMPORTANT: doit être le dernier plugin pour gérer les cookies dans les server actions
	],
	pages: {
		error: "/error",
		signIn: "/login",
		signUp: "/signup",
	},
	session: {
		expiresIn: AUTH_SESSION_CONFIG.expiresIn,
		updateAge: AUTH_SESSION_CONFIG.updateAge,
		cookieCache: AUTH_SESSION_CONFIG.cookieCache,
	},
	hooks: {
		after: createAuthMiddleware(async (ctx) => {
			const newSession = ctx.context.newSession;

			// Vérifier qu'une nouvelle session a été créée (connexion/inscription réussie)
			if (!newSession) {
				return; // Pas de nouvelle session, rien à faire
			}

			// Récupérer le cookie de session visiteur du panier
			const cartSessionId = ctx.getCookie("cart_session");

			// 🛒 MERGE DU PANIER (import dynamique pour éviter le cycle de dépendances)
			if (cartSessionId) {
				try {
					const { mergeCarts } = await import("@/modules/cart/actions/merge-carts");
					const cartResult = await mergeCarts(
						newSession.user.id,
						cartSessionId
					);

					if (cartResult.status === ActionStatus.SUCCESS) {
						// ✅ Merge réussi : supprimer le cookie
						ctx.setCookie("cart_session", "", {
							maxAge: 0,
							path: "/",
						});
					}
				} catch (error) {
					// Ignore - Cookie preserved for retry
				}
			}

			// ❤️ MERGE DE LA WISHLIST (import dynamique pour éviter le cycle de dépendances)
			const wishlistSessionId = ctx.getCookie("wishlist_session");
			const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
			if (wishlistSessionId && UUID_V4_REGEX.test(wishlistSessionId)) {
				try {
					const { mergeWishlists } = await import("@/modules/wishlist/actions/merge-wishlists");
					const wishlistResult = await mergeWishlists(
						newSession.user.id,
						wishlistSessionId
					);

					if (wishlistResult.status === ActionStatus.SUCCESS) {
						// ✅ Merge réussi : supprimer le cookie
						ctx.setCookie("wishlist_session", "", {
							maxAge: 0,
							path: "/",
						});
					}
				} catch (error) {
					// Log l'erreur pour debugging mais continue (cookie preserved for retry)
					console.error('[AUTH] Wishlist merge failed:', error);
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
							deletedAt: null,
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
					console.error('[AUTH] Guest order linking failed:', error);
				}
			}
		}),
	},
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
