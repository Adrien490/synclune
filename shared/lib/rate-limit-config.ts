/**
 * Configuration centralisée des limites de rate limiting
 *
 * Ce fichier définit toutes les limites de taux pour l'ensemble de l'application.
 * Modifiez ces valeurs pour ajuster les limites sans toucher au code métier.
 *
 * 🎯 PHILOSOPHIE DES LIMITES :
 * - Utilisateurs connectés : Limites plus permissives (identifiés, traçables)
 * - Visiteurs : Limites plus strictes (anonymes, risque de spam)
 * - Actions sensibles (auth, paiement) : Limites très strictes
 * - Actions fréquentes (panier) : Limites modérées mais surveillées
 */

import type { RateLimitConfig } from "./rate-limit";

/**
 * Convertit des minutes en millisecondes
 */
const minutes = (n: number) => n * 60 * 1000;

/**
 * Convertit des heures en millisecondes
 */
const hours = (n: number) => n * 60 * 60 * 1000;

/**
 * Convertit des secondes en millisecondes
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const seconds = (n: number) => n * 1000;

// ========================================
// 🛒 PANIER (CART)
// ========================================

/**
 * Limite pour l'ajout d'articles au panier
 *
 * Protège contre :
 * - Spam de requêtes (bot qui ajoute en boucle)
 * - Utilisateurs impatients qui cliquent plusieurs fois
 *
 * Valeurs recommandées :
 * - Dev/Test : 30/min (permissif)
 * - Production : 15/min (équilibré)
 * - High-traffic : 10/min (strict)
 */
export const CART_ADD_LIMIT: RateLimitConfig = {
	limit: 15, // 15 ajouts maximum
	windowMs: minutes(1), // par minute
};

/**
 * Limite pour la mise à jour de quantité dans le panier
 *
 * Plus permissif que l'ajout car action fréquente et légitime
 * (utilisateur qui ajuste les quantités)
 */
export const CART_UPDATE_LIMIT: RateLimitConfig = {
	limit: 20, // 20 modifications maximum
	windowMs: minutes(1), // par minute
};

/**
 * Limite pour la suppression d'articles du panier
 *
 * Même limite que la mise à jour (action similaire)
 */
export const CART_REMOVE_LIMIT: RateLimitConfig = {
	limit: 20, // 20 suppressions maximum
	windowMs: minutes(1), // par minute
};

/**
 * Limite pour la validation du panier (pre-checkout)
 *
 * Plus permissive car utilisee lors du checkout
 * Evite le blocage de l'utilisateur au moment critique
 */
export const CART_VALIDATE_LIMIT: RateLimitConfig = {
	limit: 30, // 30 validations maximum
	windowMs: minutes(5), // par 5 minutes
};

/**
 * Limite pour la fusion des paniers (guest -> user)
 *
 * Stricte car ne doit pas etre appelee souvent
 * Declenchee uniquement a la connexion
 */
export const CART_MERGE_LIMIT: RateLimitConfig = {
	limit: 10, // 10 fusions maximum
	windowMs: minutes(1), // par minute
};

// ========================================
// 💳 PAIEMENT (PAYMENT)
// ========================================

/**
 * Limite pour la création de sessions de paiement Stripe
 *
 * TRÈS IMPORTANT : Protège contre :
 * - Abus de l'API Stripe (coût par requête)
 * - Tentatives de fraude
 * - Surcharge du système de commandes
 *
 * ⚠️ RECOMMANDATION : Réduire si vous constatez des abus
 * - Actuel : 10/min (permissif pour v1)
 * - Recommandé production : 5/heure pour visiteurs, 10/heure pour utilisateurs connectés
 */
export const CHECKOUT_CREATE_SESSION_LIMIT: RateLimitConfig = {
	limit: 10, // 10 sessions maximum
	windowMs: minutes(1), // par minute
};

/**
 * Limite pour la validation de codes promo/réduction
 *
 * Protège contre :
 * - Brute force de codes promo
 * - Spam de tentatives de validation
 */
export const DISCOUNT_CODE_VALIDATE_LIMIT: RateLimitConfig = {
	limit: 10, // 10 tentatives maximum
	windowMs: minutes(5), // par 5 minutes
};

// ========================================
// 🔐 AUTHENTIFICATION (AUTH)
// ========================================

/**
 * Limite pour les tentatives de connexion (login)
 *
 * TRÈS STRICT : Protège contre :
 * - Brute force d'email/mot de passe
 * - Credential stuffing (bots avec bases de données volées)
 *
 * Note : Cette limite utilise un identifiant composite `login:${email}:${ip}`
 * pour être plus stricte (limite par couple email+IP, pas juste par IP)
 */
export const AUTH_LOGIN_LIMIT: RateLimitConfig = {
	limit: 5, // 5 tentatives maximum
	windowMs: minutes(15), // par 15 minutes
};

/**
 * Limite pour les inscriptions (signup)
 *
 * STRICT : Protège contre :
 * - Création de comptes en masse (spam)
 * - Bots d'inscription
 * - Pollution de la base de données
 */
export const AUTH_SIGNUP_LIMIT: RateLimitConfig = {
	limit: 3, // 3 inscriptions maximum
	windowMs: hours(1), // par heure
};

/**
 * Limite pour les demandes de reset de mot de passe
 *
 * Protège contre :
 * - Spam d'emails de reset
 * - Tentatives d'énumération d'emails (découvrir quels emails existent)
 */
export const AUTH_PASSWORD_RESET_LIMIT: RateLimitConfig = {
	limit: 3, // 3 demandes maximum
	windowMs: hours(1), // par heure
};

/**
 * Limite pour la vérification d'email (envoi de code)
 *
 * Protège contre spam d'emails de vérification
 */
export const AUTH_EMAIL_VERIFICATION_LIMIT: RateLimitConfig = {
	limit: 5, // 5 envois maximum
	windowMs: hours(1), // par heure
};

/**
 * Limite pour le changement de mot de passe
 *
 * Protège contre :
 * - Tentatives répétées de changement de mot de passe
 * - Abus potentiels du système
 *
 * NOTE: Renforcement de la sécurité - limite stricte pour éviter les abus
 */
export const AUTH_PASSWORD_CHANGE_LIMIT: RateLimitConfig = {
	limit: 3, // 3 changements maximum (réduit de 5 à 3 pour plus de sécurité)
	windowMs: hours(1), // par heure
};

// ========================================
// 📧 CONTACT & COMMUNICATION
// ========================================

/**
 * Limite pour l'envoi de messages de contact
 *
 * STRICT : Protège contre :
 * - Spam du formulaire de contact
 * - Bots malveillants
 * - Pollution de la boîte mail admin
 */
export const CONTACT_SEND_MESSAGE_LIMIT: RateLimitConfig = {
	limit: 3, // 3 messages maximum
	windowMs: hours(1), // par heure
};

/**
 * Limite pour l'inscription à la newsletter
 *
 * Protège contre inscriptions en masse
 */
export const NEWSLETTER_SUBSCRIBE_LIMIT: RateLimitConfig = {
	limit: 5, // 5 inscriptions maximum
	windowMs: hours(1), // par heure
};

// ========================================
// 🎨 PERSONNALISATION (CUSTOMIZATION)
// ========================================

/**
 * Limite pour les demandes de devis personnalisé
 *
 * Modérément strict (action légitime mais coûteuse en traitement)
 */
export const CUSTOMIZATION_QUOTE_REQUEST_LIMIT: RateLimitConfig = {
	limit: 5, // 5 demandes maximum
	windowMs: hours(1), // par heure
};

/**
 * Limite pour l'upload d'images (personnalisation)
 *
 * Protège contre :
 * - Spam d'uploads
 * - Saturation du stockage
 */
export const CUSTOMIZATION_IMAGE_UPLOAD_LIMIT: RateLimitConfig = {
	limit: 10, // 10 uploads maximum
	windowMs: minutes(5), // par 5 minutes
};

// ========================================
// 📦 COMMANDES (ORDERS)
// ========================================

/**
 * Limite pour la création de commandes (sans passer par Stripe)
 *
 * Note : Si vous créez des commandes directement (admin, etc.)
 */
export const ORDER_CREATE_LIMIT: RateLimitConfig = {
	limit: 5, // 5 commandes maximum
	windowMs: hours(1), // par heure
};

/**
 * Limite pour l'annulation de commandes
 *
 * Protège contre abus d'annulations répétées
 */
export const ORDER_CANCEL_LIMIT: RateLimitConfig = {
	limit: 3, // 3 annulations maximum
	windowMs: hours(1), // par heure
};

// ========================================
// 🔍 RECHERCHE & CONSULTATION
// ========================================

/**
 * Limite pour les recherches de produits
 *
 * Protège contre scraping agressif
 * Plus permissif car action fréquente et légitime
 */
export const PRODUCT_SEARCH_LIMIT: RateLimitConfig = {
	limit: 50, // 50 recherches maximum
	windowMs: minutes(1), // par minute
};

/**
 * Limite pour les avis/reviews de produits
 *
 * Protège contre spam de reviews
 */
export const PRODUCT_REVIEW_LIMIT: RateLimitConfig = {
	limit: 5, // 5 avis maximum
	windowMs: hours(24), // par jour
};

// ========================================
// 🎯 CONFIGURATION PAR ENVIRONNEMENT
// ========================================

/**
 * Permet d'ajuster toutes les limites selon l'environnement
 *
 * Utilisation :
 * ```ts
 * const limit = isDevelopment()
 *   ? adjustForEnvironment(CART_ADD_LIMIT, 'development')
 *   : CART_ADD_LIMIT;
 * ```
 */
export function adjustForEnvironment(
	config: RateLimitConfig,
	env: "development" | "production" | "test"
): RateLimitConfig {
	switch (env) {
		case "development":
			// En dev, on multiplie les limites par 10 pour faciliter les tests
			return {
				limit: (config.limit ?? 10) * 10,
				windowMs: config.windowMs,
			};
		case "test":
			// En test, limites très permissives
			return {
				limit: 999999,
				windowMs: config.windowMs,
			};
		case "production":
		default:
			return config;
	}
}

/**
 * Détecte l'environnement actuel
 */
export function getCurrentEnvironment(): "development" | "production" | "test" {
	if (process.env.NODE_ENV === "test") return "test";
	if (process.env.NODE_ENV === "development") return "development";
	return "production";
}

/**
 * Helper pour appliquer automatiquement l'ajustement d'environnement
 *
 * @example
 * ```ts
 * const limit = getConfigForEnvironment(CART_ADD_LIMIT);
 * ```
 */
export function getConfigForEnvironment(config: RateLimitConfig): RateLimitConfig {
	const env = getCurrentEnvironment();
	return adjustForEnvironment(config, env);
}

// ========================================
// ❤️ WISHLIST (FAVORIS)
// ========================================

/**
 * Limite pour l'ajout/suppression de favoris
 *
 * Protège contre :
 * - Spam de requêtes (bot qui ajoute en boucle)
 * - Utilisateurs impatients qui cliquent plusieurs fois
 */
export const WISHLIST_TOGGLE_LIMIT: RateLimitConfig = {
	limit: 20, // 20 toggles maximum
	windowMs: minutes(1), // par minute
};

/**
 * Limite pour la fusion des wishlists (guest -> user)
 *
 * Stricte car ne doit pas être appelée souvent
 * Déclenchée uniquement à la connexion
 */
export const WISHLIST_MERGE_LIMIT: RateLimitConfig = {
	limit: 10, // 10 fusions maximum
	windowMs: minutes(1), // par minute
};

// ========================================
// 📊 EXPORT GROUPÉ PAR DOMAINE
// ========================================

/**
 * Toutes les limites du panier
 */
export const CART_LIMITS = {
	ADD: CART_ADD_LIMIT,
	UPDATE: CART_UPDATE_LIMIT,
	REMOVE: CART_REMOVE_LIMIT,
	VALIDATE: CART_VALIDATE_LIMIT,
	MERGE: CART_MERGE_LIMIT,
} as const;

/**
 * Toutes les limites d'authentification
 */
export const AUTH_LIMITS = {
	LOGIN: AUTH_LOGIN_LIMIT,
	SIGNUP: AUTH_SIGNUP_LIMIT,
	PASSWORD_RESET: AUTH_PASSWORD_RESET_LIMIT,
	PASSWORD_CHANGE: AUTH_PASSWORD_CHANGE_LIMIT,
	EMAIL_VERIFICATION: AUTH_EMAIL_VERIFICATION_LIMIT,
} as const;

/**
 * Toutes les limites de paiement
 */
export const PAYMENT_LIMITS = {
	CREATE_SESSION: CHECKOUT_CREATE_SESSION_LIMIT,
	VALIDATE_DISCOUNT: DISCOUNT_CODE_VALIDATE_LIMIT,
} as const;

/**
 * Toutes les limites de contact/communication
 */
export const COMMUNICATION_LIMITS = {
	CONTACT: CONTACT_SEND_MESSAGE_LIMIT,
	NEWSLETTER: NEWSLETTER_SUBSCRIBE_LIMIT,
} as const;

/**
 * Toutes les limites de personnalisation
 */
export const CUSTOMIZATION_LIMITS = {
	QUOTE_REQUEST: CUSTOMIZATION_QUOTE_REQUEST_LIMIT,
	IMAGE_UPLOAD: CUSTOMIZATION_IMAGE_UPLOAD_LIMIT,
} as const;

/**
 * Toutes les limites de commandes
 */
export const ORDER_LIMITS = {
	CREATE: ORDER_CREATE_LIMIT,
	CANCEL: ORDER_CANCEL_LIMIT,
} as const;

/**
 * Toutes les limites de recherche/consultation
 */
export const PRODUCT_LIMITS = {
	SEARCH: PRODUCT_SEARCH_LIMIT,
	REVIEW: PRODUCT_REVIEW_LIMIT,
} as const;

/**
 * Toutes les limites de la wishlist
 * Note: ADD, REMOVE, CLEAR utilisent la même limite que TOGGLE pour cohérence
 */
export const WISHLIST_LIMITS = {
	TOGGLE: WISHLIST_TOGGLE_LIMIT,
	ADD: WISHLIST_TOGGLE_LIMIT,
	REMOVE: WISHLIST_TOGGLE_LIMIT,
	CLEAR: WISHLIST_TOGGLE_LIMIT,
	MERGE: WISHLIST_MERGE_LIMIT,
} as const;
