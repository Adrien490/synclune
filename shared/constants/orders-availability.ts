/**
 * SSOT de la disponibilité des commandes (pré-lancement).
 *
 * Tant que `ORDERS_AVAILABLE === false` :
 * - l'avis `OrdersClosedNotice` s'affiche sous le hero de la page d'accueil
 *   (en flux normal, pas en bannière haute — cf. conflit navbar transparente),
 *   ainsi que sur la fiche produit, le footer du panier et la page paiement ;
 * - les boutons d'ajout au panier sont désactivés côté UI ;
 * - les Server Actions panier/paiement sont bloquées côté serveur via
 *   `assertStoreOpen()` (le vrai garde-fou — l'UI désactivée n'est qu'un confort).
 *
 * Pour ouvrir les commandes le jour du lancement : passer cette constante à
 * `true` (aucune migration, aucun déploiement de schéma nécessaire).
 *
 * NB : indépendant du flag `StoreSettings.isClosed` qui, lui, remplace toute la
 * page par un écran de fermeture (boutique invisible). Ici la boutique reste
 * navigable — seules les commandes sont en pause.
 */
// Annotation `: boolean` volontaire (pas `false` littéral) : évite que TypeScript
// ne fige les conditions `!ORDERS_AVAILABLE` en « toujours vrai » (lint
// no-unnecessary-condition) et garde le flip à `true` au go-live sans churn.
export const ORDERS_AVAILABLE: boolean = false;

/** Adresse de contact affichée pendant la pause des commandes. */
const ORDERS_PAUSED_CONTACT_EMAIL = "synclune@gmail.com";

/**
 * Message affiché aux visiteurs tant que les commandes ne sont pas ouvertes.
 * Pensé pour une clientèle large, y compris peu à l'aise avec le web : phrases
 * courtes, ton doux, contact mis en avant.
 */
export const ORDERS_PAUSED_NOTICE = {
	title: "Le site est actuellement en pause.",
	body: "Les créations restent visibles, mais les commandes ne sont pas encore ouvertes. Pour toute demande ou commande en attendant la réouverture, vous pouvez me contacter par mail à l'adresse suivante :",
	email: ORDERS_PAUSED_CONTACT_EMAIL,
} as const;

/** Message court pour les boutons d'achat désactivés + le retour Server Action. */
export const ORDERS_PAUSED_SHORT_MESSAGE = "Les commandes ne sont pas encore ouvertes.";
