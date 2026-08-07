/**
 * Types pour le rate limiting
 */

export interface RateLimitConfig {
	/**
	 * Segment de clé du compteur — OBLIGATOIRE.
	 *
	 * La clé du store est `ratelimit:<name>:<identifier>`. Sans ce champ, elle ne
	 * portait que l'identifiant : toutes les actions partageant un `user:<id>` /
	 * `ip:<ip>` partageaient **un seul compteur**, si bien que la limite effective
	 * de chacune était le MINIMUM des limites en présence, avec la fenêtre de la
	 * première entrée créée. Concrètement, 5 consultations de fiche produit
	 * (`PRODUCT_COOKIE_ACTION`, 30/min) suffisaient à faire répondre 429 au
	 * formulaire de connexion (`AUTH_LOGIN`, 5/15 min) sur des identifiants
	 * pourtant valides — verrouillage de l'unique compte d'administration.
	 *
	 * ⚠️ Requis par le type, et non optionnel avec repli : un preset qui l'oublie
	 * retomberait en silence sur le compteur partagé, soit exactement le défaut
	 * corrigé. C'est `tsc` qui doit l'imposer, pas une convention.
	 *
	 * Deux presets de même `name` partagent délibérément un budget (ex. facture et
	 * avoir, même profil CPU). Convention : identifiant du const sans `_LIMIT`,
	 * en kebab-case (`CART_ADD_LIMIT` → `"cart-add"`).
	 *
	 */
	name: string;

	/**
	 * Nombre maximum de requêtes autorisées dans la fenêtre
	 * @default 10
	 */
	limit?: number;

	/**
	 * Durée de la fenêtre en millisecondes
	 * @default 60000 (1 minute)
	 */
	windowMs?: number;

	/**
	 * Exempte l'appelant du plafond transverse `GLOBAL_IP_LIMIT` (100 req/min/IP),
	 * appliqué AVANT la limite par action.
	 *
	 * WEBHOOK-AUDIT-003 : réservé aux endpoints machine-to-machine (webhooks Stripe /
	 * PA) dont le trafic légitime provient d'un petit pool d'IP émettrices et dépasse
	 * structurellement 100 req/min — un remboursement émet à lui seul 4 événements
	 * (`charge.refunded`, `refund.created`, `refund.updated`, `charge.refund.updated`).
	 * Sans ce flag, leur `limit` propre est inatteignable : le plafond global tranche
	 * en premier et renvoie 429, ce qui déclenche un backoff Stripe inutile et gonfle
	 * `WebhookEvent.attempts`.
	 *
	 * Ne dispense PAS de la blacklist ni de la limite par action — c'est pourquoi on
	 * passe par ce flag plutôt qu'en omettant `ipAddress` à l'appel de `checkRateLimit`
	 * (ce qui court-circuiterait aussi whitelist et blacklist).
	 *
	 * @default false
	 */
	skipGlobalIpLimit?: boolean;
}

export interface RateLimitResult {
	/**
	 * Indique si la requête est autorisée
	 */
	success: boolean;

	/**
	 * Nombre de requêtes restantes dans la fenêtre
	 */
	remaining: number;

	/**
	 * Nombre total de requêtes autorisées
	 */
	limit: number;

	/**
	 * Timestamp (ms) de réinitialisation du compteur
	 */
	reset: number;

	/**
	 * Nombre de secondes avant de pouvoir réessayer (si bloqué)
	 */
	retryAfter?: number;

	/**
	 * Message d'erreur si rate limit dépassé
	 */
	error?: string;
}
