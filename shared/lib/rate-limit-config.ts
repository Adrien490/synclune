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
 */
export const CHECKOUT_CREATE_SESSION_LIMIT: RateLimitConfig = {
	limit: 15, // 15 sessions maximum
	windowMs: hours(1), // par heure
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
// 🔑 SESSIONS
// ========================================

/**
 * Limite pour la revocation de sessions
 *
 * Protege contre abus de revocation repetee
 */
export const SESSION_REVOKE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(1),
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

/**
 * Limite pour le chargement paginé d'avis (load more)
 *
 * Protège contre scraping rapide de tous les avis d'un produit
 * Permissif car action de lecture fréquente et légitime
 */
export const REVIEW_LOAD_MORE_LIMIT: RateLimitConfig = {
	limit: 30, // 30 chargements maximum
	windowMs: minutes(1), // par minute
};

/**
 * Limite pour le chargement paginé du catalogue produits (load more mobile)
 *
 * Permissif car action de lecture fréquente sur catalogue mobile avec
 * auto-scroll (IntersectionObserver 80% viewport). Aligné sur
 * PRODUCT_SEARCH_LIMIT pour cohérence (mêmes filtres serveur).
 */
export const PRODUCT_LOAD_MORE_LIMIT: RateLimitConfig = {
	limit: 60,
	windowMs: minutes(1),
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

/**
 * Limite pour vider la wishlist
 *
 * Stricte car operation destructive (suppression de tous les items, jusqu'a 500)
 */
const WISHLIST_CLEAR_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(5),
};

/**
 * Limite pour deplacer un favori vers le panier
 *
 * Aligne avec CART_ADD_LIMIT car l'action ajoute au panier (cote serveur,
 * un appel = un add cart + un remove wishlist atomique)
 */
const WISHLIST_MOVE_TO_CART_LIMIT: RateLimitConfig = {
	limit: 15,
	windowMs: minutes(1),
};

// ========================================
// 📊 EXPORT GROUPÉ PAR DOMAINE
// ========================================

/**
 * Limite pour vider le panier
 *
 * Stricte car operation destructive (suppression de tous les items)
 */
const CART_CLEAR_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour l'application/retrait d'un code promo au panier
 *
 * Stricte contre brute force de codes (complementaire au rate limit discount validate)
 */
const CART_DISCOUNT_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour les metadonnees du panier (mode de fulfillment)
 *
 * Permissive car modifications fréquentes legitimes en checkout
 */
const CART_METADATA_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(1),
};

/**
 * Limite pour reorder depuis une commande
 *
 * Modérée car action legitime mais potentiellement couteuse (multiple adds)
 */
const CART_REORDER_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(5),
};

/**
 * Toutes les limites du panier
 */
export const CART_LIMITS = {
	ADD: CART_ADD_LIMIT,
	UPDATE: CART_UPDATE_LIMIT,
	REMOVE: CART_REMOVE_LIMIT,
	VALIDATE: CART_VALIDATE_LIMIT,
	MERGE: CART_MERGE_LIMIT,
	CLEAR: CART_CLEAR_LIMIT,
	DISCOUNT: CART_DISCOUNT_LIMIT,
	METADATA: CART_METADATA_LIMIT,
	REORDER: CART_REORDER_LIMIT,
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
 * Limite pour la mise à jour du montant Payment Intent
 *
 * Plus permissif que CREATE_SESSION car déclenché par changement de pays/code promo
 * Protège contre spam de l'API Stripe
 */
export const PAYMENT_UPDATE_AMOUNT_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

/**
 * Limite pour l'annulation d'un Payment Intent orphelin
 *
 * Déclenchée best-effort au re-init quand le hash panier change. Rare en usage
 * normal — la limite borne surtout l'abus (spam de l'API Stripe `cancel`).
 */
const PAYMENT_CANCEL_ORPHAN_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

/**
 * Toutes les limites de paiement
 */
export const PAYMENT_LIMITS = {
	CREATE_SESSION: CHECKOUT_CREATE_SESSION_LIMIT,
	VALIDATE_DISCOUNT: DISCOUNT_CODE_VALIDATE_LIMIT,
	UPDATE_AMOUNT: PAYMENT_UPDATE_AMOUNT_LIMIT,
	CANCEL_ORPHAN: PAYMENT_CANCEL_ORPHAN_LIMIT,
} as const;

/**
 * Toutes les limites de contact/communication
 */
export const COMMUNICATION_LIMITS = {
	CONTACT: CONTACT_SEND_MESSAGE_LIMIT,
} as const;

/**
 * Toutes les limites de commandes
 */
/**
 * Limite pour le telechargement de factures (client)
 *
 * Protege contre abus de generation PDF (CPU-intensive)
 */
export const ORDER_INVOICE_DOWNLOAD_LIMIT: RateLimitConfig = {
	limit: 10, // 10 telechargements maximum
	windowMs: hours(1), // par heure
};

/**
 * Limite pour le telechargement de factures (admin) — EINV-SEC-004
 *
 * Admin n'est pas bypassé : un compte ADMIN compromis ou un insider malveillant
 * peut exfiltrer toutes les factures sans trace. 200/h est large pour les audits
 * fiscaux légitimes, mais une exfiltration massive (>200/h) déclenchera un 429.
 * En complément : Sentry.captureMessage à 80% du quota pour alerte proactive.
 */
const ADMIN_INVOICE_DOWNLOAD_LIMIT: RateLimitConfig = {
	limit: 200, // 200 telechargements maximum
	windowMs: hours(1), // par heure
};

/**
 * Limite pour le polling du statut de paiement post-checkout (CHECKOUT-AUDIT-004).
 *
 * Appelé par `/paiement/confirmation` toutes les 3s tant que `paymentStatus`
 * reste PENDING. 60/min couvre un polling intensif sur 30s + retry F5
 * raisonnable. Au-delà, on suspecte un client bogué ou un scraping.
 */
const ORDER_STATUS_POLL_LIMIT: RateLimitConfig = {
	limit: 60,
	windowMs: minutes(1),
};

/**
 * Limite pour la page de suivi de commande invité (AUDIT-BIZ-001)
 *
 * La page est authentifiée par un token HMAC dans l'URL, pas par une session :
 * la limite est donc par IP. Généreuse (un client rafraîchit légitimement son
 * suivi), mais elle borne le coût d'un scan de tokens — le token fait 32 hex
 * (128 bits de recherche) ET l'`orderNumber` porte 48 bits d'entropie CSPRNG,
 * donc le brute-force est déjà hors de portée ; ceci protège surtout la DB.
 */
const ORDER_TRACKING_VIEW_LIMIT: RateLimitConfig = {
	limit: 60,
	windowMs: hours(1),
};

/**
 * Limite pour le rafraîchissement de ses propres commandes (espace client).
 *
 * Déclenchable au geste (pull-to-refresh) autant qu'au bouton : la limite doit
 * rester tolérante à quelques tirages successifs sans laisser un doigt insistant
 * marteler l'invalidation de cache.
 */
const USER_ORDERS_REFRESH_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(1),
};

export const ORDER_LIMITS = {
	CREATE: ORDER_CREATE_LIMIT,
	CANCEL: ORDER_CANCEL_LIMIT,
	INVOICE_DOWNLOAD: ORDER_INVOICE_DOWNLOAD_LIMIT,
	ADMIN_INVOICE_DOWNLOAD: ADMIN_INVOICE_DOWNLOAD_LIMIT,
	STATUS_POLL: ORDER_STATUS_POLL_LIMIT,
	TRACKING_VIEW: ORDER_TRACKING_VIEW_LIMIT,
	USER_REFRESH: USER_ORDERS_REFRESH_LIMIT,
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
 * Limite pour les mutations unitaires sur commandes (admin)
 *
 * Moderee car actions admin individuelles (cancel, ship, deliver, etc.)
 */
export const ADMIN_ORDER_SINGLE_OPERATIONS_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

/**
 * Toutes les limites admin commandes
 */
/**
 * Limite pour le rafraichissement du cache commandes (admin)
 */
export const ADMIN_ORDER_REFRESH_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(1),
};

/**
 * Limite pour l'export bulk CSV du livre de recettes (admin)
 *
 * STRICTE car requete lourde : jusqu'a 50_000 lignes par export.
 * 10/heure = headroom suffisant pour usage legitime, protege la DB d'un admin
 * compromis ou d'une boucle de script.
 */
const ADMIN_ORDER_EXPORT_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: hours(1),
};

/**
 * Limite pour la relance manuelle de generation de facture (admin)
 *
 * STRICTE car `retryInvoiceGeneration` declenche SYNCHRONEMENT `reconcileInvoiceOrder` :
 * rendu PDF + upload UploadThing + potentiellement `voidInvoice`, qui prend l'advisory
 * lock de l'annee (`2_000_000+year`) dans une transaction a `TX_TIMEOUT_LONG` (30 s).
 * Un clic repete sur la table d'anomalies serialisait autant de transactions de 30 s
 * sur ce lock, bloquant toute autre emission d'avoir pendant ce temps.
 */
const ADMIN_INVOICE_RETRY_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(1),
};

export const ADMIN_ORDER_LIMITS = {
	RESEND_EMAIL: ADMIN_ORDER_RESEND_EMAIL_LIMIT,
	MARK_AS_PAID: ADMIN_ORDER_MARK_AS_PAID_LIMIT,
	SINGLE_OPERATIONS: ADMIN_ORDER_SINGLE_OPERATIONS_LIMIT,
	REFRESH: ADMIN_ORDER_REFRESH_LIMIT,
	EXPORT: ADMIN_ORDER_EXPORT_LIMIT,
	INVOICE_RETRY: ADMIN_INVOICE_RETRY_LIMIT,
} as const;

/**
 * Limite pour la recherche fuzzy admin (orders/users)
 *
 * Protège les indexes GIN trgm contre scraping si session admin compromise
 */
export const ADMIN_SEARCH_LIMIT: RateLimitConfig = {
	limit: 60,
	windowMs: minutes(1),
};

/**
 * Toutes les limites de recherche/consultation
 */
/**
 * Limite pour les actions cookie (produits recents, recherches recentes)
 *
 * Pas de DB, uniquement des cookies - seuil genereux
 */
export const PRODUCT_COOKIE_ACTION_LIMIT: RateLimitConfig = {
	limit: 30,
	windowMs: minutes(1),
};

export const PRODUCT_LIMITS = {
	SEARCH: PRODUCT_SEARCH_LIMIT,
	REVIEW: PRODUCT_REVIEW_LIMIT,
	COOKIE_ACTION: PRODUCT_COOKIE_ACTION_LIMIT,
} as const;

/**
 * Toutes les limites de la wishlist
 * Note: ADD, REMOVE utilisent la même limite que TOGGLE pour cohérence
 */
export const WISHLIST_LIMITS = {
	TOGGLE: WISHLIST_TOGGLE_LIMIT,
	ADD: WISHLIST_TOGGLE_LIMIT,
	REMOVE: WISHLIST_TOGGLE_LIMIT,
	MERGE: WISHLIST_MERGE_LIMIT,
	CLEAR: WISHLIST_CLEAR_LIMIT,
	MOVE_TO_CART: WISHLIST_MOVE_TO_CART_LIMIT,
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
 * Toutes les limites admin
 */
export const ADMIN_LIMITS = {
	TESTIMONIAL_CREATE: ADMIN_TESTIMONIAL_CREATE_LIMIT,
	TESTIMONIAL_UPDATE: ADMIN_TESTIMONIAL_UPDATE_LIMIT,
	TESTIMONIAL_DELETE: ADMIN_TESTIMONIAL_DELETE_LIMIT,
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

export const ADMIN_COLLECTION_REFRESH_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

const ADMIN_COLLECTION_DUPLICATE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

const ADMIN_COLLECTION_TOGGLE_STATUS_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

const ADMIN_COLLECTION_MANAGE_PRODUCTS_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

export const ADMIN_COLLECTION_LIMITS = {
	CREATE: ADMIN_COLLECTION_CREATE_LIMIT,
	UPDATE: ADMIN_COLLECTION_UPDATE_LIMIT,
	DELETE: ADMIN_COLLECTION_DELETE_LIMIT,
	REFRESH: ADMIN_COLLECTION_REFRESH_LIMIT,
	DUPLICATE: ADMIN_COLLECTION_DUPLICATE_LIMIT,
	TOGGLE_STATUS: ADMIN_COLLECTION_TOGGLE_STATUS_LIMIT,
	MANAGE_PRODUCTS: ADMIN_COLLECTION_MANAGE_PRODUCTS_LIMIT,
} as const;

// ========================================
// 👤 UTILISATEURS (USER ACCOUNT)
// ========================================

/**
 * Limite pour la suppression de compte (RGPD - Suppression de compte)
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
 * Limite pour la demande de changement d'email
 *
 * STRICT : Protège contre le spam d'emails de confirmation
 */
export const USER_EMAIL_CHANGE_LIMIT: RateLimitConfig = {
	limit: 3, // 3 demandes maximum
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
 * Limite pour l'annulation de suppression de compte
 *
 * Modérée : protège contre les abus de toggle suppression/annulation
 */
export const USER_CANCEL_DELETION_LIMIT: RateLimitConfig = {
	limit: 5, // 5 annulations maximum
	windowMs: hours(1), // par heure
};

/**
 * Toutes les limites du compte utilisateur
 */
/**
 * Limite pour la dissociation d'un compte OAuth lie
 *
 * STRICT : Action de securite qui change les methodes d'authentification
 */
const USER_UNLINK_OAUTH_LIMIT: RateLimitConfig = {
	limit: 5, // 5 dissociations maximum
	windowMs: hours(1), // par heure
};

export const USER_LIMITS = {
	DELETE_ACCOUNT: USER_DELETE_ACCOUNT_LIMIT,
	CANCEL_DELETION: USER_CANCEL_DELETION_LIMIT,
	EXPORT_DATA: USER_EXPORT_DATA_LIMIT,
	UPDATE_PROFILE: USER_UPDATE_PROFILE_LIMIT,
	CHANGE_EMAIL: USER_EMAIL_CHANGE_LIMIT,
	UNLINK_OAUTH: USER_UNLINK_OAUTH_LIMIT,
} as const;

// ========================================
// 👤 ADMINISTRATION UTILISATEURS (ADMIN USER)
// ========================================

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
 * Réduite car buildUserDataExport est une requête lourde multi-tables
 */
export const ADMIN_USER_EXPORT_DATA_LIMIT: RateLimitConfig = {
	limit: 3, // 3 exports maximum
	windowMs: minutes(5), // par 5 minutes
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
 * Limite per-target pour l'envoi d'email de reset password (admin)
 *
 * STRICT : Protege l'utilisateur cible contre le flood d'emails
 * (meme user ne peut pas recevoir plus de 3 emails/heure meme depuis plusieurs admins)
 */
const ADMIN_USER_SEND_RESET_TARGET_LIMIT: RateLimitConfig = {
	limit: 3, // 3 emails maximum par user cible
	windowMs: hours(1), // par heure
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
 * Limite pour l'anonymisation immediate (admin, GDPR Art. 17)
 *
 * TRES STRICT : Action irreversible, demandes legales/CNIL/DPO uniquement
 */
const ADMIN_USER_ANONYMIZE_NOW_LIMIT: RateLimitConfig = {
	limit: 5, // 5 anonymisations maximum
	windowMs: hours(1), // par heure
};

/**
 * Limite pour le rafraichissement du cache utilisateurs (admin)
 */
export const ADMIN_USER_REFRESH_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(1),
};

export const ADMIN_USER_LIMITS = {
	SINGLE_OPERATIONS: ADMIN_USER_SINGLE_OPERATIONS_LIMIT,
	DELETE_USER: ADMIN_USER_DELETE_LIMIT,
	EXPORT_DATA: ADMIN_USER_EXPORT_DATA_LIMIT,
	SEND_RESET: ADMIN_USER_SEND_RESET_LIMIT,
	SEND_RESET_TARGET: ADMIN_USER_SEND_RESET_TARGET_LIMIT,
	INVALIDATE_SESSIONS: ADMIN_USER_INVALIDATE_SESSIONS_LIMIT,
	REFRESH: ADMIN_USER_REFRESH_LIMIT,
	ANONYMIZE_NOW: ADMIN_USER_ANONYMIZE_NOW_LIMIT,
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

export const ADMIN_PRODUCT_TYPE_REFRESH_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(1),
};

const ADMIN_PRODUCT_TYPE_DUPLICATE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

export const ADMIN_PRODUCT_TYPE_LIMITS = {
	CREATE: ADMIN_PRODUCT_TYPE_CREATE_LIMIT,
	UPDATE: ADMIN_PRODUCT_TYPE_UPDATE_LIMIT,
	DELETE: ADMIN_PRODUCT_TYPE_DELETE_LIMIT,
	TOGGLE_STATUS: ADMIN_PRODUCT_TYPE_TOGGLE_STATUS_LIMIT,
	REFRESH: ADMIN_PRODUCT_TYPE_REFRESH_LIMIT,
	DUPLICATE: ADMIN_PRODUCT_TYPE_DUPLICATE_LIMIT,
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
 * Limite pour le reordonnancement des medias d'un SKU (admin)
 */
export const ADMIN_SKU_REORDER_MEDIA_LIMIT: RateLimitConfig = {
	limit: 30,
	windowMs: minutes(5),
};

/**
 * Limite pour la definition du media principal d'un SKU (admin)
 */
export const ADMIN_SKU_SET_PRIMARY_MEDIA_LIMIT: RateLimitConfig = {
	limit: 30,
	windowMs: minutes(5),
};

/**
 * Limite pour la mise a jour de l'alt text d'un media SKU (admin)
 */
export const ADMIN_SKU_UPDATE_MEDIA_ALT_LIMIT: RateLimitConfig = {
	limit: 30,
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
	REORDER_MEDIA: ADMIN_SKU_REORDER_MEDIA_LIMIT,
	SET_PRIMARY_MEDIA: ADMIN_SKU_SET_PRIMARY_MEDIA_LIMIT,
	UPDATE_MEDIA_ALT: ADMIN_SKU_UPDATE_MEDIA_ALT_LIMIT,
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
 * Toutes les limites de remboursements
 */
/**
 * Limite pour le rafraichissement du cache remboursements (admin)
 */
export const REFUND_REFRESH_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(1),
};

export const REFUND_LIMITS = {
	CREATE: REFUND_CREATE_LIMIT,
	PROCESS: REFUND_PROCESS_LIMIT,
	SINGLE_OPERATION: REFUND_SINGLE_OPERATION_LIMIT,
	REFRESH: REFUND_REFRESH_LIMIT,
} as const;

// ========================================
// CODES PROMO (DISCOUNTS) - ADMIN
// ========================================

/**
 * Limite pour la creation de codes promo (admin)
 */
export const ADMIN_DISCOUNT_CREATE_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

/**
 * Limite pour la modification de codes promo (admin)
 */
export const ADMIN_DISCOUNT_UPDATE_LIMIT: RateLimitConfig = {
	limit: 30,
	windowMs: minutes(5),
};

/**
 * Limite pour la suppression de codes promo (admin)
 */
export const ADMIN_DISCOUNT_DELETE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour le toggle de statut de codes promo (admin)
 */
export const ADMIN_DISCOUNT_TOGGLE_STATUS_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

/**
 * Limite pour la duplication de codes promo (admin)
 */
export const ADMIN_DISCOUNT_DUPLICATE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour le rafraichissement du cache codes promo (admin)
 */
export const ADMIN_DISCOUNT_REFRESH_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(1),
};

/**
 * Limite pour la restauration d'un code promo soft-deleted (admin)
 */
const ADMIN_DISCOUNT_RESTORE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour la prolongation rapide de validite (admin)
 */
const ADMIN_DISCOUNT_EXTEND_VALIDITY_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

/**
 * Limite pour la reinitialisation du compteur d'usage (admin)
 *
 * Stricte car action sensible (perte du compteur usageCount)
 */
const ADMIN_DISCOUNT_RESET_COUNTER_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(5),
};

/**
 * Toutes les limites admin codes promo
 */
export const ADMIN_DISCOUNT_LIMITS = {
	CREATE: ADMIN_DISCOUNT_CREATE_LIMIT,
	UPDATE: ADMIN_DISCOUNT_UPDATE_LIMIT,
	DELETE: ADMIN_DISCOUNT_DELETE_LIMIT,
	TOGGLE_STATUS: ADMIN_DISCOUNT_TOGGLE_STATUS_LIMIT,
	DUPLICATE: ADMIN_DISCOUNT_DUPLICATE_LIMIT,
	REFRESH: ADMIN_DISCOUNT_REFRESH_LIMIT,
	RESTORE: ADMIN_DISCOUNT_RESTORE_LIMIT,
	EXTEND_VALIDITY: ADMIN_DISCOUNT_EXTEND_VALIDITY_LIMIT,
	RESET_COUNTER: ADMIN_DISCOUNT_RESET_COUNTER_LIMIT,
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
 * Limite pour la creation de reponses admin aux avis (admin)
 */
export const ADMIN_REVIEW_RESPONSE_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

/**
 * Limite pour la moderation d'avis (admin)
 */
export const ADMIN_REVIEW_MODERATE_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

/**
 * Limite pour la restauration d'un avis soft-deleted (admin)
 */
const ADMIN_REVIEW_RESTORE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour le rafraichissement du cache avis (admin) — utilisé par le
 * banner cross-page "Sélectionner les N filtrés".
 */
const ADMIN_REVIEW_REFRESH_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(1),
};

export const ADMIN_REVIEW_LIMITS = {
	RESPONSE: ADMIN_REVIEW_RESPONSE_LIMIT,
	MODERATE: ADMIN_REVIEW_MODERATE_LIMIT,
	RESTORE: ADMIN_REVIEW_RESTORE_LIMIT,
	REFRESH: ADMIN_REVIEW_REFRESH_LIMIT,
} as const;

// ========================================
// DEMANDES DE RETOUR (CLIENT)
// ========================================

/**
 * Limite pour les demandes de retour client
 *
 * Stricte car action sensible (3 par jour par utilisateur)
 */
export const RETURN_REQUEST_LIMIT: RateLimitConfig = {
	limit: 3,
	windowMs: hours(24),
};

// ========================================
// 📢 ADMIN ANNOUNCEMENT OPERATIONS
// ========================================

export const ADMIN_ANNOUNCEMENT_CREATE_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

export const ADMIN_ANNOUNCEMENT_UPDATE_LIMIT: RateLimitConfig = {
	limit: 30,
	windowMs: minutes(5),
};

export const ADMIN_ANNOUNCEMENT_DELETE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

export const ADMIN_ANNOUNCEMENT_TOGGLE_STATUS_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

const ADMIN_ANNOUNCEMENT_DUPLICATE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

export const ADMIN_ANNOUNCEMENT_LIMITS = {
	CREATE: ADMIN_ANNOUNCEMENT_CREATE_LIMIT,
	UPDATE: ADMIN_ANNOUNCEMENT_UPDATE_LIMIT,
	DELETE: ADMIN_ANNOUNCEMENT_DELETE_LIMIT,
	TOGGLE_STATUS: ADMIN_ANNOUNCEMENT_TOGGLE_STATUS_LIMIT,
	DUPLICATE: ADMIN_ANNOUNCEMENT_DUPLICATE_LIMIT,
} as const;

export const PUBLIC_ANNOUNCEMENT_DISMISS_LIMIT: RateLimitConfig = {
	limit: 60,
	windowMs: minutes(1),
};

// ========================================
// 🏪 ADMIN STORE SETTINGS
// ========================================

const ADMIN_STORE_SETTINGS_CLOSE_STORE_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(5),
};

const ADMIN_STORE_SETTINGS_REOPEN_STORE_LIMIT: RateLimitConfig = {
	limit: 5,
	windowMs: minutes(5),
};

const ADMIN_STORE_SETTINGS_UPDATE_CLOSURE_MESSAGE_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

const ADMIN_STORE_SETTINGS_UPDATE_REOPENS_AT_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(5),
};

const ADMIN_STORE_SETTINGS_UPDATE_ANNOUNCEMENT_LIMIT: RateLimitConfig = {
	limit: 20,
	windowMs: minutes(5),
};

export const ADMIN_STORE_SETTINGS_LIMITS = {
	CLOSE_STORE: ADMIN_STORE_SETTINGS_CLOSE_STORE_LIMIT,
	REOPEN_STORE: ADMIN_STORE_SETTINGS_REOPEN_STORE_LIMIT,
	UPDATE_CLOSURE_MESSAGE: ADMIN_STORE_SETTINGS_UPDATE_CLOSURE_MESSAGE_LIMIT,
	UPDATE_REOPENS_AT: ADMIN_STORE_SETTINGS_UPDATE_REOPENS_AT_LIMIT,
	UPDATE_ANNOUNCEMENT: ADMIN_STORE_SETTINGS_UPDATE_ANNOUNCEMENT_LIMIT,
} as const;

/**
 * Limite pour le rafraichissement du cache dashboard (admin)
 */
const ADMIN_DASHBOARD_REFRESH_LIMIT: RateLimitConfig = {
	limit: 10,
	windowMs: minutes(1),
};

export const ADMIN_DASHBOARD_LIMITS = {
	REFRESH: ADMIN_DASHBOARD_REFRESH_LIMIT,
} as const;

// ========================================
// 🪝 WEBHOOKS
// ========================================

/**
 * Limite pour les requêtes entrantes sur le webhook Stripe (`/api/webhooks/stripe`)
 *
 * Protège contre :
 * - Flooding de webhooks avec signatures invalides (CPU drain HMAC verify)
 * - Tentative d'épuisement de ressources avant `stripe.webhooks.constructEvent`
 *
 * WEBHOOK-AUDIT-002 : Stripe peut burster jusqu'à ~10 events/sec (= 600/min) sur un
 * endpoint, notamment lors d'un rejeu de backlog après incident ou d'un batch de
 * remboursements. L'ancienne limite de 100/min (~1,67/s) était SOUS ce pic légitime
 * → des events Stripe authentiques renvoyaient 429, retardant un traitement
 * revenu-critique (confirmations, décréments stock, remboursements) que Stripe ne
 * retente qu'en backoff. On monte à 1000/min : largement au-dessus du pic Stripe
 * (10× headroom) tout en restant un garde-fou anti-CPU-drain (un attaquant floodant
 * des signatures invalides reste plafonné ; le HMAC verify est de toute façon
 * micro-coûteux). La vraie défense d'authenticité reste la signature, pas ce compteur.
 * NB : compteur in-memory par instance Vercel (cf. CLAUDE.md § Security) → plafond
 * effectif × N instances, best-effort.
 * Appliqué AVANT signature verify pour rejeter les floods au plus tôt.
 */
export const STRIPE_WEBHOOK_LIMIT: RateLimitConfig = {
	limit: 1000,
	windowMs: minutes(1),
	// WEBHOOK-AUDIT-003 : sans cette exemption, le relèvement 100 → 1000 ci-dessus est
	// PUREMENT DÉCORATIF — `checkRateLimitInMemory` évalue le plafond transverse
	// `GLOBAL_IP_LIMIT` (100/min/IP) AVANT la limite par action, et la route webhook lui
	// passe explicitement l'IP. Le plafond effectif était donc resté à 100/min, très en
	// dessous du pic Stripe que ce réglage prétendait absorber.
	skipGlobalIpLimit: true,
};

/**
 * Webhook plateforme agréée (PDP/PA — Phase 5).
 *
 * Volume légitime attendu nettement plus faible que Stripe (≤1 event/facture
 * vs N events/order Stripe). On garde 100 req/min/IP comme garde-fou CPU-drain
 * (anti-bombardement de signatures invalides). Appliqué AVANT verify signature.
 *
 * WEBHOOK-AUDIT-003 : exempté du plafond transverse `GLOBAL_IP_LIMIT` comme le webhook
 * Stripe. Sans le flag, le compteur global (partagé avec toutes les autres actions vues
 * depuis cette IP) pourrait épuiser le budget de la PA avant même sa propre limite —
 * qui vaut ici exactement 100/min, donc reste le seul plafond effectif.
 */
export const PDP_WEBHOOK_LIMIT: RateLimitConfig = {
	limit: 100,
	windowMs: minutes(1),
	skipGlobalIpLimit: true,
};
