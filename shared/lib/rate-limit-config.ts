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

// ========================================
// 📦 ADMIN ORDER OPERATIONS
// ========================================

/**
 * Limite pour le renvoi d'emails de commande (admin)
 *
 * Stricte pour eviter le spam de mails clients
 */
export const ADMIN_ORDER_RESEND_EMAIL_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour le marquage comme paye (admin)
 *
 * Moderee car mutation financiere
 */
export const ADMIN_ORDER_MARK_AS_PAID_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour les operations bulk sur commandes (admin)
 *
 * Stricte car operations destructives en masse
 */
export const ADMIN_ORDER_BULK_OPERATIONS_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(5),
};

/**
 * Toutes les limites admin commandes
 */
export const ADMIN_ORDER_LIMITS = {
	RESEND_EMAIL: ADMIN_ORDER_RESEND_EMAIL_LIMIT,
	MARK_AS_PAID: ADMIN_ORDER_MARK_AS_PAID_LIMIT,
	BULK_OPERATIONS: ADMIN_ORDER_BULK_OPERATIONS_LIMIT,
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
	MERGE: WISHLIST_MERGE_LIMIT,
} as const;

// ========================================
// 🛡️ ADMINISTRATION (ADMIN)
// ========================================

/**
 * Limite pour la création de témoignages (admin)
 *
 * Protège contre :
 * - Spam de création (bot ou erreur de script)
 * - Abus de l'interface admin
 */
export const ADMIN_TESTIMONIAL_CREATE_LIMIT: RateLimitConfig = {
	limit: 20, // 20 créations maximum
	windowMs: minutes(5), // par 5 minutes
};

/**
 * Limite pour la mise à jour de témoignages (admin)
 *
 * Plus permissif car modifications fréquentes possibles
 */
export const ADMIN_TESTIMONIAL_UPDATE_LIMIT: RateLimitConfig = {
	limit: 30, // 30 modifications maximum
	windowMs: minutes(5), // par 5 minutes
};

/**
 * Limite pour la suppression de témoignages (admin)
 *
 * Modéré car action irréversible (soft delete)
 */
export const ADMIN_TESTIMONIAL_DELETE_LIMIT: RateLimitConfig = {
	limit: 10, // 10 suppressions maximum
	windowMs: minutes(5), // par 5 minutes
};

/**
 * Limite pour la suppression en masse de témoignages (admin)
 *
 * Plus stricte pour éviter les suppressions accidentelles massives
 */
export const ADMIN_TESTIMONIAL_BULK_DELETE_LIMIT: RateLimitConfig = {
	limit: 5, // 5 opérations bulk maximum
	windowMs: minutes(5), // par 5 minutes
};

/**
 * Toutes les limites admin
 */
export const ADMIN_LIMITS = {
	TESTIMONIAL_CREATE: ADMIN_TESTIMONIAL_CREATE_LIMIT,
	TESTIMONIAL_UPDATE: ADMIN_TESTIMONIAL_UPDATE_LIMIT,
	TESTIMONIAL_DELETE: ADMIN_TESTIMONIAL_DELETE_LIMIT,
	TESTIMONIAL_BULK_DELETE: ADMIN_TESTIMONIAL_BULK_DELETE_LIMIT,
} as const;

// ========================================
// 📁 ADMIN COLLECTION OPERATIONS
// ========================================

export const ADMIN_COLLECTION_CREATE_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

export const ADMIN_COLLECTION_UPDATE_LIMIT: RateLimitConfig = {
	limit: 30,
	windowMs: minutes(5),
};

export const ADMIN_COLLECTION_DELETE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

export const ADMIN_COLLECTION_BULK_DELETE_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(5),
};

export const ADMIN_COLLECTION_BULK_ARCHIVE_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(5),
};

export const ADMIN_COLLECTION_REFRESH_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

export const ADMIN_COLLECTION_LIMITS = {
	CREATE: ADMIN_COLLECTION_CREATE_LIMIT,
	UPDATE: ADMIN_COLLECTION_UPDATE_LIMIT,
	DELETE: ADMIN_COLLECTION_DELETE_LIMIT,
	BULK_DELETE: ADMIN_COLLECTION_BULK_DELETE_LIMIT,
	BULK_ARCHIVE: ADMIN_COLLECTION_BULK_ARCHIVE_LIMIT,
	REFRESH: ADMIN_COLLECTION_REFRESH_LIMIT,
} as const;

// ========================================
// 👤 UTILISATEURS (USER ACCOUNT)
// ========================================

/**
 * Limite pour la suppression de compte (droit à l'oubli RGPD)
 *
 * TRÈS STRICT : Action irréversible et sensible
 * Protège contre les suppressions accidentelles multiples
 */
export const USER_DELETE_ACCOUNT_LIMIT: RateLimitConfig = {
	limit: 3, // 3 suppressions maximum
	windowMs: hours(1), // par heure
};

/**
 * Limite pour l'export de données personnelles (portabilité RGPD)
 *
 * STRICT : Action intensive en ressources
 * Protège contre le spam d'export
 */
export const USER_EXPORT_DATA_LIMIT: RateLimitConfig = {
	limit: 5, // 5 exports maximum
	windowMs: hours(1), // par heure
};

/**
 * Limite pour la mise à jour du profil
 *
 * Modérée car action fréquente et légitime
 */
export const USER_UPDATE_PROFILE_LIMIT: RateLimitConfig = {
	limit: 10, // 10 modifications maximum
	windowMs: minutes(1), // par minute
};

/**
 * Toutes les limites du compte utilisateur
 */
export const USER_LIMITS = {
	DELETE_ACCOUNT: USER_DELETE_ACCOUNT_LIMIT,
	EXPORT_DATA: USER_EXPORT_DATA_LIMIT,
	UPDATE_PROFILE: USER_UPDATE_PROFILE_LIMIT,
} as const;

// ========================================
// 👤 ADMINISTRATION UTILISATEURS (ADMIN USER)
// ========================================

/**
 * Limite pour les opérations bulk admin sur utilisateurs
 *
 * STRICT : Actions en masse potentiellement dangereuses
 * (suspend, delete, restore, change role en bulk)
 */
export const ADMIN_USER_BULK_OPERATIONS_LIMIT: RateLimitConfig = {
	limit: 5, // 5 opérations bulk maximum
	windowMs: minutes(1), // par minute
};

/**
 * Limite pour les opérations unitaires admin fréquentes
 *
 * Plus permissif car actions unitaires
 * (change role, suspend, restore)
 */
export const ADMIN_USER_SINGLE_OPERATIONS_LIMIT: RateLimitConfig = {
	limit: 20, // 20 opérations maximum
	windowMs: minutes(1), // par minute
};

/**
 * Limite pour la suppression d'utilisateur (admin)
 *
 * Modérée car action importante mais pas irréversible (soft delete)
 */
export const ADMIN_USER_DELETE_LIMIT: RateLimitConfig = {
	limit: 10, // 10 suppressions maximum
	windowMs: minutes(1), // par minute
};

/**
 * Limite pour l'export de données utilisateur (admin)
 *
 * Modérée car action intensive mais nécessaire
 */
export const ADMIN_USER_EXPORT_DATA_LIMIT: RateLimitConfig = {
	limit: 10, // 10 exports maximum
	windowMs: minutes(1), // par minute
};

/**
 * Limite pour l'envoi d'email de reset password (admin)
 *
 * Modérée pour éviter le spam d'emails
 */
export const ADMIN_USER_SEND_RESET_LIMIT: RateLimitConfig = {
	limit: 10, // 10 envois maximum
	windowMs: minutes(1), // par minute
};

/**
 * Limite pour l'invalidation de sessions (admin)
 *
 * Modérée car action de sécurité
 */
export const ADMIN_USER_INVALIDATE_SESSIONS_LIMIT: RateLimitConfig = {
	limit: 10, // 10 invalidations maximum
	windowMs: minutes(1), // par minute
};

/**
 * Toutes les limites admin utilisateurs
 */
export const ADMIN_USER_LIMITS = {
	BULK_OPERATIONS: ADMIN_USER_BULK_OPERATIONS_LIMIT,
	SINGLE_OPERATIONS: ADMIN_USER_SINGLE_OPERATIONS_LIMIT,
	DELETE_USER: ADMIN_USER_DELETE_LIMIT,
	EXPORT_DATA: ADMIN_USER_EXPORT_DATA_LIMIT,
	SEND_RESET: ADMIN_USER_SEND_RESET_LIMIT,
	INVALIDATE_SESSIONS: ADMIN_USER_INVALIDATE_SESSIONS_LIMIT,
} as const;

// ========================================
// 📦 ADMIN PRODUCT OPERATIONS
// ========================================

/**
 * Limite pour la création de produits (admin)
 */
export const ADMIN_PRODUCT_CREATE_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

/**
 * Limite pour la mise à jour de produits (admin)
 */
export const ADMIN_PRODUCT_UPDATE_LIMIT: RateLimitConfig = {
	limit: 30,
	windowMs: minutes(5),
};

/**
 * Limite pour la suppression de produits (admin)
 */
export const ADMIN_PRODUCT_DELETE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour la suppression en masse de produits (admin)
 */
export const ADMIN_PRODUCT_BULK_DELETE_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(5),
};

/**
 * Limite pour l'archivage en masse de produits (admin)
 */
export const ADMIN_PRODUCT_BULK_ARCHIVE_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(5),
};

/**
 * Limite pour le changement de statut en masse de produits (admin)
 */
export const ADMIN_PRODUCT_BULK_STATUS_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(5),
};

/**
 * Limite pour le toggle de statut de produit (admin)
 */
export const ADMIN_PRODUCT_TOGGLE_STATUS_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

/**
 * Limite pour la duplication de produits (admin)
 */
export const ADMIN_PRODUCT_DUPLICATE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour la mise à jour des collections d'un produit (admin)
 */
export const ADMIN_PRODUCT_UPDATE_COLLECTIONS_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

/**
 * Limite pour le rafraichissement du cache produits (admin)
 */
export const ADMIN_PRODUCT_REFRESH_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(1),
};

/**
 * Toutes les limites admin produits
 */
export const ADMIN_PRODUCT_LIMITS = {
	CREATE: ADMIN_PRODUCT_CREATE_LIMIT,
	UPDATE: ADMIN_PRODUCT_UPDATE_LIMIT,
	DELETE: ADMIN_PRODUCT_DELETE_LIMIT,
	BULK_DELETE: ADMIN_PRODUCT_BULK_DELETE_LIMIT,
	BULK_ARCHIVE: ADMIN_PRODUCT_BULK_ARCHIVE_LIMIT,
	BULK_STATUS: ADMIN_PRODUCT_BULK_STATUS_LIMIT,
	TOGGLE_STATUS: ADMIN_PRODUCT_TOGGLE_STATUS_LIMIT,
	DUPLICATE: ADMIN_PRODUCT_DUPLICATE_LIMIT,
	UPDATE_COLLECTIONS: ADMIN_PRODUCT_UPDATE_COLLECTIONS_LIMIT,
	REFRESH: ADMIN_PRODUCT_REFRESH_LIMIT,
} as const;

// ========================================
// 🪨 ADMIN MATERIAL OPERATIONS
// ========================================

/**
 * Limite pour la creation de materiaux (admin)
 */
export const ADMIN_MATERIAL_CREATE_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

/**
 * Limite pour la mise a jour de materiaux (admin)
 */
export const ADMIN_MATERIAL_UPDATE_LIMIT: RateLimitConfig = {
	limit: 30,
	windowMs: minutes(5),
};

/**
 * Limite pour la suppression de materiaux (admin)
 */
export const ADMIN_MATERIAL_DELETE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour le toggle de statut de materiau (admin)
 */
export const ADMIN_MATERIAL_TOGGLE_STATUS_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

/**
 * Limite pour la duplication de materiaux (admin)
 */
export const ADMIN_MATERIAL_DUPLICATE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour les operations bulk sur materiaux (admin)
 */
export const ADMIN_MATERIAL_BULK_OPERATIONS_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(5),
};

/**
 * Limite pour le rafraichissement du cache materiaux (admin)
 */
export const ADMIN_MATERIAL_REFRESH_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(1),
};

/**
 * Toutes les limites admin materiaux
 */
export const ADMIN_MATERIAL_LIMITS = {
	CREATE: ADMIN_MATERIAL_CREATE_LIMIT,
	UPDATE: ADMIN_MATERIAL_UPDATE_LIMIT,
	DELETE: ADMIN_MATERIAL_DELETE_LIMIT,
	TOGGLE_STATUS: ADMIN_MATERIAL_TOGGLE_STATUS_LIMIT,
	DUPLICATE: ADMIN_MATERIAL_DUPLICATE_LIMIT,
	BULK_OPERATIONS: ADMIN_MATERIAL_BULK_OPERATIONS_LIMIT,
	REFRESH: ADMIN_MATERIAL_REFRESH_LIMIT,
} as const;

// ========================================
// 🎨 ADMIN COLOR OPERATIONS
// ========================================

/**
 * Limite pour la creation de couleurs (admin)
 */
export const ADMIN_COLOR_CREATE_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

/**
 * Limite pour la mise a jour de couleurs (admin)
 */
export const ADMIN_COLOR_UPDATE_LIMIT: RateLimitConfig = {
	limit: 30,
	windowMs: minutes(5),
};

/**
 * Limite pour la suppression de couleurs (admin)
 */
export const ADMIN_COLOR_DELETE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour le toggle de statut de couleur (admin)
 */
export const ADMIN_COLOR_TOGGLE_STATUS_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

/**
 * Limite pour la duplication de couleurs (admin)
 */
export const ADMIN_COLOR_DUPLICATE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour les operations bulk sur couleurs (admin)
 */
export const ADMIN_COLOR_BULK_OPERATIONS_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(5),
};

/**
 * Limite pour le rafraichissement du cache couleurs (admin)
 */
export const ADMIN_COLOR_REFRESH_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(1),
};

/**
 * Toutes les limites admin couleurs
 */
export const ADMIN_COLOR_LIMITS = {
	CREATE: ADMIN_COLOR_CREATE_LIMIT,
	UPDATE: ADMIN_COLOR_UPDATE_LIMIT,
	DELETE: ADMIN_COLOR_DELETE_LIMIT,
	TOGGLE_STATUS: ADMIN_COLOR_TOGGLE_STATUS_LIMIT,
	DUPLICATE: ADMIN_COLOR_DUPLICATE_LIMIT,
	BULK_OPERATIONS: ADMIN_COLOR_BULK_OPERATIONS_LIMIT,
	REFRESH: ADMIN_COLOR_REFRESH_LIMIT,
} as const;

// ========================================
// 📦 ADMIN PRODUCT TYPE OPERATIONS
// ========================================

export const ADMIN_PRODUCT_TYPE_CREATE_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

export const ADMIN_PRODUCT_TYPE_UPDATE_LIMIT: RateLimitConfig = {
	limit: 30,
	windowMs: minutes(5),
};

export const ADMIN_PRODUCT_TYPE_DELETE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

export const ADMIN_PRODUCT_TYPE_TOGGLE_STATUS_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

export const ADMIN_PRODUCT_TYPE_BULK_OPERATIONS_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(5),
};

export const ADMIN_PRODUCT_TYPE_REFRESH_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(1),
};

export const ADMIN_PRODUCT_TYPE_LIMITS = {
	CREATE: ADMIN_PRODUCT_TYPE_CREATE_LIMIT,
	UPDATE: ADMIN_PRODUCT_TYPE_UPDATE_LIMIT,
	DELETE: ADMIN_PRODUCT_TYPE_DELETE_LIMIT,
	TOGGLE_STATUS: ADMIN_PRODUCT_TYPE_TOGGLE_STATUS_LIMIT,
	BULK_OPERATIONS: ADMIN_PRODUCT_TYPE_BULK_OPERATIONS_LIMIT,
	REFRESH: ADMIN_PRODUCT_TYPE_REFRESH_LIMIT,
} as const;

// ========================================
// 💰 ADMIN SKU OPERATIONS
// ========================================

/**
 * Limite pour l'ajustement de stock d'un SKU (admin)
 *
 * Modérée pour permettre les ajustements rapides
 */
export const ADMIN_SKU_ADJUST_STOCK_LIMIT: RateLimitConfig = {
	limit: 20, // 20 ajustements maximum
	windowMs: minutes(1), // par minute
};

/**
 * Limite pour la mise à jour de prix d'un SKU (admin)
 *
 * Modérée pour permettre les modifications rapides
 */
export const ADMIN_SKU_UPDATE_PRICE_LIMIT: RateLimitConfig = {
	limit: 20, // 20 modifications maximum
	windowMs: minutes(1), // par minute
};

/**
 * Limite pour la création de SKUs (admin)
 */
export const ADMIN_SKU_CREATE_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

/**
 * Limite pour la mise à jour de SKUs (admin)
 */
export const ADMIN_SKU_UPDATE_LIMIT: RateLimitConfig = {
	limit: 30,
	windowMs: minutes(5),
};

/**
 * Limite pour la suppression de SKUs (admin)
 */
export const ADMIN_SKU_DELETE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour la duplication de SKUs (admin)
 */
export const ADMIN_SKU_DUPLICATE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour le changement de statut/défaut de SKUs (admin)
 */
export const ADMIN_SKU_TOGGLE_STATUS_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

/**
 * Limite pour les opérations bulk sur SKUs (admin)
 */
export const ADMIN_SKU_BULK_OPERATIONS_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(5),
};

/**
 * Toutes les limites admin SKUs
 */
export const ADMIN_SKU_LIMITS = {
	ADJUST_STOCK: ADMIN_SKU_ADJUST_STOCK_LIMIT,
	UPDATE_PRICE: ADMIN_SKU_UPDATE_PRICE_LIMIT,
	CREATE: ADMIN_SKU_CREATE_LIMIT,
	UPDATE: ADMIN_SKU_UPDATE_LIMIT,
	DELETE: ADMIN_SKU_DELETE_LIMIT,
	DUPLICATE: ADMIN_SKU_DUPLICATE_LIMIT,
	TOGGLE_STATUS: ADMIN_SKU_TOGGLE_STATUS_LIMIT,
	BULK_OPERATIONS: ADMIN_SKU_BULK_OPERATIONS_LIMIT,
} as const;

// ========================================
// REMBOURSEMENTS (REFUNDS)
// ========================================

/**
 * Limite pour la création de remboursements (admin)
 */
export const REFUND_CREATE_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(1),
};

/**
 * Limite pour le traitement de remboursements via Stripe (admin)
 */
export const REFUND_PROCESS_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(1),
};

/**
 * Limite pour les opérations unitaires sur remboursements (admin)
 */
export const REFUND_SINGLE_OPERATION_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(1),
};

/**
 * Limite pour les opérations bulk sur remboursements (admin)
 */
export const REFUND_BULK_OPERATION_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(1),
};

/**
 * Toutes les limites de remboursements
 */
export const REFUND_LIMITS = {
	CREATE: REFUND_CREATE_LIMIT,
	PROCESS: REFUND_PROCESS_LIMIT,
	SINGLE_OPERATION: REFUND_SINGLE_OPERATION_LIMIT,
	BULK_OPERATION: REFUND_BULK_OPERATION_LIMIT,
} as const;

// ========================================
// 📍 ADRESSES (ADDRESSES)
// ========================================

/**
 * Limite pour la creation/modification d'adresses
 *
 * Moderee car action legitime mais protege contre spam
 */
export const ADDRESS_MUTATE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(1),
};

/**
 * Limite pour la recherche d'adresses (proxy BAN API)
 *
 * Plus permissive car l'autocomplete genere beaucoup de requetes
 */
export const ADDRESS_SEARCH_LIMIT: RateLimitConfig = {
	limit: 30,
	windowMs: minutes(1),
};

/**
 * Toutes les limites d'adresses
 */
export const ADDRESS_LIMITS = {
	MUTATE: ADDRESS_MUTATE_LIMIT,
	SEARCH: ADDRESS_SEARCH_LIMIT,
} as const;

// ========================================
// ADMIN REVIEW LIMITS
// ========================================

/**
 * Limite pour l'envoi d'emails de demande d'avis (admin)
 *
 * Protege contre le spam d'emails clients en cas de compte admin compromis
 */
export const ADMIN_REVIEW_SEND_EMAIL_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour les operations bulk sur les avis (admin)
 */
export const ADMIN_REVIEW_BULK_OPERATIONS_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(5),
};

/**
 * Toutes les limites admin avis
 */
export const ADMIN_REVIEW_LIMITS = {
	SEND_EMAIL: ADMIN_REVIEW_SEND_EMAIL_LIMIT,
	BULK_OPERATIONS: ADMIN_REVIEW_BULK_OPERATIONS_LIMIT,
} as const;

