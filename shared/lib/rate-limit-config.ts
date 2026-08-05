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
	name: "cart-add",
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
	name: "cart-update",
	limit: 20, // 20 modifications maximum
	windowMs: minutes(1), // par minute
};

/**
 * Limite pour la suppression d'articles du panier
 *
 * Même limite que la mise à jour (action similaire)
 */
export const CART_REMOVE_LIMIT: RateLimitConfig = {
	name: "cart-remove",
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
	name: "cart-validate",
	limit: 30, // 30 validations maximum
	windowMs: minutes(5), // par 5 minutes
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
	name: "checkout-create-session",
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
	name: "discount-code-validate",
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
 * ⚠️ Identifiant réel : `ip:<ip>` (via `enforceRateLimitForCurrentUser`, l'appelant
 * n'étant par définition pas connecté). Le commentaire annonçait ici un composite
 * `login:${email}:${ip}` qui n'a jamais existé — et cette description fausse
 * masquait exactement le défaut KI-004 : tant que le `name` du preset n'entrait
 * pas dans la clé, ce compteur était PARTAGÉ avec toutes les actions publiques
 * sur la même IP, si bien que 5 consultations de fiche produit suffisaient à
 * verrouiller le formulaire de connexion. Audit rate limiting 2026-07-31.
 *
 * Conséquence assumée du keying par IP seule : un attaquant qui fait tourner les
 * emails depuis une IP est plafonné à 5 essais TOUS emails confondus (plus strict
 * qu'un composite), mais plusieurs personnes derrière un même NAT se partagent le
 * budget. Acceptable ici : un seul compte d'administration existe.
 */
export const AUTH_LOGIN_LIMIT: RateLimitConfig = {
	name: "auth-login",
	limit: 5, // 5 tentatives maximum
	windowMs: minutes(15), // par 15 minutes
};

/**
 * Limite pour les demandes de reset de mot de passe
 *
 * Protège contre :
 * - Spam d'emails de reset
 * - Tentatives d'énumération d'emails (découvrir quels emails existent)
 */
export const AUTH_PASSWORD_RESET_LIMIT: RateLimitConfig = {
	name: "auth-password-reset",
	limit: 3, // 3 demandes maximum
	windowMs: hours(1), // par heure
};

/**
 * Limite pour la vérification d'email (envoi de code)
 *
 * Protège contre spam d'emails de vérification
 */
export const AUTH_EMAIL_VERIFICATION_LIMIT: RateLimitConfig = {
	name: "auth-email-verification",
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
	name: "auth-password-change",
	limit: 3, // 3 changements maximum (réduit de 5 à 3 pour plus de sécurité)
	windowMs: hours(1), // par heure
};

/**
 * Limite pour la déconnexion
 *
 * `logout` est une Server Action PUBLIQUE (pas de garde d'auth — Better Auth
 * exige de pouvoir déconnecter une session orpheline), et chaque appel émet un
 * `auth.api.signOut()` donc une écriture DB. Sans plafond, c'est un RPC non
 * authentifié à coût base de données illimité. Limite large : un utilisateur
 * légitime se déconnecte une fois. Audit rate limiting 2026-07-31.
 */
export const AUTH_LOGOUT_LIMIT: RateLimitConfig = {
	name: "auth-logout",
	limit: 10,
	windowMs: minutes(1),
};

// ========================================
// ⏰ CRON
// ========================================

/**
 * Limite d'invocation des routes cron (`app/api/cron/*`), par IP.
 *
 * Le `CRON_SECRET` (comparé en temps constant, échec fermé) reste la garde
 * d'autorisation ; ce plafond borne le COÛT. Deux surfaces sans lui :
 * un secret fuité donnait une invocation illimitée de jobs destructifs
 * (`hard-delete-retention`, `cleanup-orphan-media`), et un flot de 401
 * démarrait la lambda sans aucun compteur — `checkRateLimit` n'était appelé
 * nulle part sur ce chemin.
 *
 * ⚠️ Volontairement bien au-dessus du besoin réel : plafond Hobby oblige,
 * un cron légitime s'exécute UNE fois par jour (cf. CLAUDE.md § Cron Jobs).
 * Tout ce qui dépasse est soit un rejeu manuel, soit de l'abus.
 * Audit rate limiting 2026-07-31.
 */
export const CRON_INVOKE_LIMIT: RateLimitConfig = {
	name: "cron-invoke",
	limit: 10,
	windowMs: minutes(1),
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
	name: "product-search",
	limit: 50, // 50 recherches maximum
	windowMs: minutes(1), // par minute
};

/**
 * Limite pour le compteur vivant du panneau de filtres (« Voir les N pièces »)
 *
 * Un count SQL par pause de saisie (débounce 300ms côté client) : aligné sur
 * PRODUCT_SEARCH_LIMIT — même fréquence légitime, même surface publique, et le
 * résultat est un `"use cache"` partagé qui absorbe les répétitions.
 */
export const PRODUCT_FILTER_COUNT_LIMIT: RateLimitConfig = {
	name: "product-filter-count",
	limit: 50,
	windowMs: minutes(1),
};

/**
 * Limite pour le chargement paginé du catalogue produits (load more mobile)
 *
 * Permissif car action de lecture fréquente sur catalogue mobile avec
 * auto-scroll (IntersectionObserver 80% viewport). Aligné sur
 * PRODUCT_SEARCH_LIMIT pour cohérence (mêmes filtres serveur).
 */
export const PRODUCT_LOAD_MORE_LIMIT: RateLimitConfig = {
	name: "product-load-more",
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
	name: "wishlist-toggle",
	limit: 20, // 20 toggles maximum
	windowMs: minutes(1), // par minute
};

// WISHLIST_CLEAR_LIMIT et WISHLIST_MOVE_TO_CART_LIMIT retirés avec les actions
// `clear-wishlist` et `move-to-cart` (audit wishlist 2026-08-01 : endpoints RPC
// sans aucun appelant UI).

// ========================================
// 📊 EXPORT GROUPÉ PAR DOMAINE
// ========================================

/**
 * Limite pour vider le panier
 *
 * Stricte car operation destructive (suppression de tous les items)
 */
const CART_CLEAR_LIMIT: RateLimitConfig = {
	name: "cart-clear",
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour l'application/retrait d'un code promo au panier
 *
 * Stricte contre brute force de codes (complementaire au rate limit discount validate)
 */
const CART_DISCOUNT_LIMIT: RateLimitConfig = {
	name: "cart-discount",
	limit: 10,
	windowMs: minutes(5),
};

/**
 * Limite pour les metadonnees du panier (mode de fulfillment)
 *
 * Permissive car modifications fréquentes legitimes en checkout
 */
const CART_METADATA_LIMIT: RateLimitConfig = {
	name: "cart-metadata",
	limit: 20,
	windowMs: minutes(1),
};

/**
 * Limite pour reorder depuis une commande
 *
 * Modérée car action legitime mais potentiellement couteuse (multiple adds)
 */
const CART_REORDER_LIMIT: RateLimitConfig = {
	name: "cart-reorder",
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
	PASSWORD_RESET: AUTH_PASSWORD_RESET_LIMIT,
	PASSWORD_CHANGE: AUTH_PASSWORD_CHANGE_LIMIT,
	EMAIL_VERIFICATION: AUTH_EMAIL_VERIFICATION_LIMIT,
	LOGOUT: AUTH_LOGOUT_LIMIT,
} as const;

/**
 * Limite pour la mise à jour du montant Payment Intent
 *
 * Plus permissif que CREATE_SESSION car déclenché par changement de pays/code promo
 * Protège contre spam de l'API Stripe
 */
export const PAYMENT_UPDATE_AMOUNT_LIMIT: RateLimitConfig = {
	name: "payment-update-amount",
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
	name: "payment-cancel-orphan",
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
 * Toutes les limites de commandes
 */
/**
 * Limite pour le telechargement de factures (client)
 *
 * Protege contre abus de generation PDF (CPU-intensive)
 */
export const ORDER_INVOICE_DOWNLOAD_LIMIT: RateLimitConfig = {
	name: "order-invoice-download",
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
	name: "admin-invoice-download",
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
	name: "order-status-poll",
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
	name: "order-tracking-view",
	limit: 60,
	windowMs: hours(1),
};

export const ORDER_LIMITS = {
	INVOICE_DOWNLOAD: ORDER_INVOICE_DOWNLOAD_LIMIT,
	ADMIN_INVOICE_DOWNLOAD: ADMIN_INVOICE_DOWNLOAD_LIMIT,
	STATUS_POLL: ORDER_STATUS_POLL_LIMIT,
	TRACKING_VIEW: ORDER_TRACKING_VIEW_LIMIT,
	// USER_REFRESH parti avec l'espace client (Lot 4 S3.2 — préset sans appelant).
} as const;

// ========================================
// 🛡️ ADMINISTRATION (ADMIN) — Lot 4 SIMPLIFICATION.md S3.2 (2026-08-03)
// ========================================

/**
 * Preset PARTAGÉ de toutes les opérations d'administration.
 *
 * Avant : ~55 presets quasi identiques, un par action admin (create/update/
 * delete/duplicate/toggle/refresh × 9 modules), chacun avec son compteur. Pour
 * une boutique à UNE administratrice, cette granularité ne protégeait rien de
 * plus : toutes ces actions passent `requireAdmin()` — le rate limit borne
 * COMBIEN de fois, pas QUI.
 *
 * Le partage du compteur est DÉLIBÉRÉ et dimensionné en conséquence (leçon
 * KI-004 : un partage se CHOISIT, il ne s'hérite pas d'une clé mal construite) :
 * 120/min couvre très largement une humaine seule en rafale d'édition (bulk
 * SKU, réordonnancement de médias, drag-and-drop), tout en bornant un script
 * sur cookie volé. Les surfaces publiques, l'auth et le checkout gardent leurs
 * presets dédiés, calibrés par les audits — ne PAS les rabattre ici.
 *
 * Restent DÉDIÉS côté admin, car l'enjeu n'y est pas « une admin qui clique » :
 * - `ADMIN_ORDER_EXPORT_LIMIT` — export CSV lourd (agrégations + fichier) ;
 * - `ADMIN_MAINTENANCE_LIMIT`  — tâches qui scannent Stripe/UploadThing ;
 * - `ADMIN_SEARCH_LIMIT`       — protège les index GIN trgm du scraping ;
 * - `admin-invoice-download`   — exfiltration PDF (EINV-SEC-004, cf. ORDER_LIMITS).
 */
export const ADMIN_LIMIT: RateLimitConfig = {
	name: "admin",
	limit: 120,
	windowMs: minutes(1),
};

/** Export CSV commandes — lourd (agrégations + fichier), serré à dessein. */
const ADMIN_ORDER_EXPORT_LIMIT: RateLimitConfig = {
	name: "admin-order-export",
	limit: 5,
	windowMs: minutes(5),
};

/**
 * Limite pour les tâches de maintenance manuelles (Lot 1 SIMPLIFICATION.md —
 * ex-crons devenus boutons sur /admin/configuration/maintenance).
 *
 * Serrée : chaque tâche scanne Stripe ou UploadThing (coûteux), est idempotente
 * et n'a aucune raison d'être relancée en rafale — une admin seule clique une
 * fois et lit le résultat.
 */
export const ADMIN_MAINTENANCE_LIMIT: RateLimitConfig = {
	name: "admin-maintenance",
	limit: 6,
	windowMs: minutes(5),
};

/**
 * Limite pour la recherche fuzzy admin (orders/users)
 *
 * Protège les indexes GIN trgm contre scraping si session admin compromise
 */
export const ADMIN_SEARCH_LIMIT: RateLimitConfig = {
	name: "admin-search",
	limit: 60,
	windowMs: minutes(1),
};

/**
 * Agrégats par module — l'API des call sites est inchangée, mais toutes les
 * clés pointent le MÊME preset partagé (déduplication par identité d'objet :
 * exactement le pattern que `rate-limit-preset-naming.regression.test.ts`
 * bénit déjà pour WISHLIST_LIMITS). Seules les clés listées « dédiées »
 * ci-dessus font exception.
 */
export const ADMIN_ORDER_LIMITS = {
	RESEND_EMAIL: ADMIN_LIMIT,
	MARK_AS_PAID: ADMIN_LIMIT,
	SINGLE_OPERATIONS: ADMIN_LIMIT,
	REFRESH: ADMIN_LIMIT,
	EXPORT: ADMIN_ORDER_EXPORT_LIMIT,
	INVOICE_RETRY: ADMIN_LIMIT,
} as const;

export const ADMIN_COLLECTION_LIMITS = {
	CREATE: ADMIN_LIMIT,
	UPDATE: ADMIN_LIMIT,
	DELETE: ADMIN_LIMIT,
	REFRESH: ADMIN_LIMIT,
} as const;

export const ADMIN_PRODUCT_LIMITS = {
	CREATE: ADMIN_LIMIT,
	UPDATE: ADMIN_LIMIT,
	DELETE: ADMIN_LIMIT,
	TOGGLE_STATUS: ADMIN_LIMIT,
	DUPLICATE: ADMIN_LIMIT,
	UPDATE_COLLECTIONS: ADMIN_LIMIT,
	REFRESH: ADMIN_LIMIT,
} as const;

export const ADMIN_MATERIAL_LIMITS = {
	CREATE: ADMIN_LIMIT,
	UPDATE: ADMIN_LIMIT,
	DELETE: ADMIN_LIMIT,
	TOGGLE_STATUS: ADMIN_LIMIT,
	DUPLICATE: ADMIN_LIMIT,
	REFRESH: ADMIN_LIMIT,
} as const;

export const ADMIN_COLOR_LIMITS = {
	CREATE: ADMIN_LIMIT,
	UPDATE: ADMIN_LIMIT,
	DELETE: ADMIN_LIMIT,
	TOGGLE_STATUS: ADMIN_LIMIT,
	DUPLICATE: ADMIN_LIMIT,
	REFRESH: ADMIN_LIMIT,
} as const;

export const ADMIN_PRODUCT_TYPE_LIMITS = {
	CREATE: ADMIN_LIMIT,
	UPDATE: ADMIN_LIMIT,
	DELETE: ADMIN_LIMIT,
	TOGGLE_STATUS: ADMIN_LIMIT,
	REFRESH: ADMIN_LIMIT,
	DUPLICATE: ADMIN_LIMIT,
} as const;

export const ADMIN_SKU_LIMITS = {
	ADJUST_STOCK: ADMIN_LIMIT,
	UPDATE_PRICE: ADMIN_LIMIT,
	CREATE: ADMIN_LIMIT,
	UPDATE: ADMIN_LIMIT,
	DELETE: ADMIN_LIMIT,
	DUPLICATE: ADMIN_LIMIT,
	TOGGLE_STATUS: ADMIN_LIMIT,
	REFRESH: ADMIN_LIMIT,
	REORDER_MEDIA: ADMIN_LIMIT,
	SET_PRIMARY_MEDIA: ADMIN_LIMIT,
	UPDATE_MEDIA_ALT: ADMIN_LIMIT,
} as const;

export const ADMIN_DISCOUNT_LIMITS = {
	CREATE: ADMIN_LIMIT,
	UPDATE: ADMIN_LIMIT,
	DELETE: ADMIN_LIMIT,
	TOGGLE_STATUS: ADMIN_LIMIT,
	DUPLICATE: ADMIN_LIMIT,
	REFRESH: ADMIN_LIMIT,
	RESTORE: ADMIN_LIMIT,
	EXTEND_VALIDITY: ADMIN_LIMIT,
	RESET_COUNTER: ADMIN_LIMIT,
} as const;

export const ADMIN_STORE_SETTINGS_LIMITS = {
	CLOSE_STORE: ADMIN_LIMIT,
	REOPEN_STORE: ADMIN_LIMIT,
	UPDATE_CLOSURE_MESSAGE: ADMIN_LIMIT,
	UPDATE_REOPENS_AT: ADMIN_LIMIT,
} as const;

export const ADMIN_DASHBOARD_LIMITS = {
	REFRESH: ADMIN_LIMIT,
} as const;

// CREATE / PROCESS / SINGLE_OPERATION partis avec le workflow refunds in-app
// (Lot 2 S3.3) ; seule la consultation garde son bouton de refresh.
export const REFUND_LIMITS = {
	REFRESH: ADMIN_LIMIT,
} as const;

// Alias encore importés individuellement (modules products et skus) — même
// objet partagé, l'inlining des call sites est opportuniste.
export const ADMIN_PRODUCT_CREATE_LIMIT = ADMIN_LIMIT;
export const ADMIN_PRODUCT_UPDATE_LIMIT = ADMIN_LIMIT;
export const ADMIN_PRODUCT_DELETE_LIMIT = ADMIN_LIMIT;
export const ADMIN_PRODUCT_TOGGLE_STATUS_LIMIT = ADMIN_LIMIT;
export const ADMIN_PRODUCT_DUPLICATE_LIMIT = ADMIN_LIMIT;
export const ADMIN_PRODUCT_UPDATE_COLLECTIONS_LIMIT = ADMIN_LIMIT;
export const ADMIN_PRODUCT_REFRESH_LIMIT = ADMIN_LIMIT;
export const ADMIN_SKU_ADJUST_STOCK_LIMIT = ADMIN_LIMIT;
export const ADMIN_SKU_UPDATE_PRICE_LIMIT = ADMIN_LIMIT;
export const ADMIN_SKU_CREATE_LIMIT = ADMIN_LIMIT;
export const ADMIN_SKU_UPDATE_LIMIT = ADMIN_LIMIT;
export const ADMIN_SKU_DELETE_LIMIT = ADMIN_LIMIT;
export const ADMIN_SKU_DUPLICATE_LIMIT = ADMIN_LIMIT;
export const ADMIN_SKU_TOGGLE_STATUS_LIMIT = ADMIN_LIMIT;
export const ADMIN_SKU_REFRESH_LIMIT = ADMIN_LIMIT;
export const ADMIN_SKU_REORDER_MEDIA_LIMIT = ADMIN_LIMIT;
export const ADMIN_SKU_SET_PRIMARY_MEDIA_LIMIT = ADMIN_LIMIT;
export const ADMIN_SKU_UPDATE_MEDIA_ALT_LIMIT = ADMIN_LIMIT;

// ========================================
// 🔍 PUBLIC — presets conservés tels quels (calibrés par les audits KI-004)
// ========================================

/**
 * Limite pour les actions cookie (produits recents, recherches recentes)
 *
 * Pas de DB, uniquement des cookies - seuil genereux
 */
export const PRODUCT_COOKIE_ACTION_LIMIT: RateLimitConfig = {
	name: "product-cookie-action",
	limit: 30,
	windowMs: minutes(1),
};

export const PRODUCT_LIMITS = {
	SEARCH: PRODUCT_SEARCH_LIMIT,
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
} as const;

/**
 * Limite pour la recherche d'adresses (proxy BAN API)
 *
 * Plus permissive car l'autocomplete genere beaucoup de requetes
 */
export const ADDRESS_SEARCH_LIMIT: RateLimitConfig = {
	name: "address-search",
	limit: 30,
	windowMs: minutes(1),
};

export const ADDRESS_LIMITS = {
	SEARCH: ADDRESS_SEARCH_LIMIT,
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
	name: "stripe-webhook",
	limit: 1000,
	windowMs: minutes(1),
	// WEBHOOK-AUDIT-003 : sans cette exemption, le relèvement 100 → 1000 ci-dessus est
	// PUREMENT DÉCORATIF — `checkRateLimitInMemory` évalue le plafond transverse
	// `GLOBAL_IP_LIMIT` (100/min/IP) AVANT la limite par action, et la route webhook lui
	// passe explicitement l'IP. Le plafond effectif était donc resté à 100/min, très en
	// dessous du pic Stripe que ce réglage prétendait absorber.
	skipGlobalIpLimit: true,
};

// Le preset PDP_WEBHOOK_LIMIT (e-reporting, retiré 2026-07-26) est parti au
// Lot 4 S3.2 — à recréer avec la machinerie PA au go-live 2027.
