import { LEGAL_VERSIONS } from "@/shared/constants/legal-versions";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/modules/emails/services/auth-emails";
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
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
		sendResetPassword: async ({ user, url, token }) => {
			// Better Auth génère automatiquement l'URL avec /api/auth/reset-password/{token}?callbackURL=...
			// On envoie cette URL directement dans l'email
			await sendPasswordResetEmail({
				to: user.email,
				url,
				token,
			});
		},
		onPasswordReset: async ({ user }) => {
			// Mot de passe réinitialisé
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

			await sendVerificationEmail({
				to: user.email,
				url: verificationUrl,
				token,
			});
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
			const userData = await prisma.user.findUnique({
				where: { id: session.userId },
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
				// Extraire IP et User-Agent pour traçabilité RGPD
				const ipAddress = request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim()
					|| request?.headers?.get?.("x-real-ip")
					|| null;
				const userAgent = request?.headers?.get?.("user-agent") || null;

				// 🛒 Créer automatiquement le panier et la wishlist + Enregistrer consentement RGPD
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

						// Enregistrer les données RGPD de consentement
						await tx.user.update({
							where: { id: user.id },
							data: {
								signupIpAddress: ipAddress,
								signupUserAgent: userAgent,
								signupSource: "website",
								termsAcceptedAt: new Date(),
								termsVersion: LEGAL_VERSIONS.TERMS,
								privacyPolicyAcceptedAt: new Date(),
								privacyPolicyVersion: LEGAL_VERSIONS.PRIVACY_POLICY,
							},
						});
					});
				} catch (error) {
					// Ne pas bloquer l'inscription si la création échoue
					// Le panier/wishlist seront créés au premier ajout (via upsert)
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
			if (wishlistSessionId) {
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
		}),
	},
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
