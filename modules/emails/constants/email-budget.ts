/**
 * Budget quotidien d'envois marketing — audit coûts P1-3.
 *
 * Le plan Resend Free impose DEUX plafonds : 3 000 emails/mois **et
 * 100 emails/jour**. Le régime permanent de Synclune (~20 commandes/mois, soit
 * ~80 emails/mois tous types confondus) tient très largement sous le plafond
 * mensuel — mais le plafond **journalier** est vulnérable aux pics.
 *
 * Le seul émetteur capable de produire une rafale est le retour-en-stock : un
 * réassort sur un produit populaire envoie autant d'emails qu'il y a d'inscrits,
 * d'un coup. Sans borne, 200 inscrits consomment les 100 envois du jour — et la
 * confirmation de commande d'un client qui achète le même jour est **rejetée en
 * 429**. Un 429 de quota journalier ne se résorbe pas dans la fenêtre de retry
 * de `send-email.ts` : l'email est perdu.
 *
 * D'où la règle : le marketing ne peut jamais consommer plus que sa part, et la
 * part restante est réservée au transactionnel (confirmations, expéditions,
 * remboursements, auth) qui, lui, n'est jamais différable.
 */

/** Plafond journalier du plan Resend Free. */
export const RESEND_DAILY_EMAIL_LIMIT = 100;

/**
 * Part du plafond journalier allouée aux envois marketing (retour-en-stock).
 *
 * 40 sur 100 : laisse 60 envois/jour au transactionnel, soit ~10× le pic
 * quotidien réaliste à 20 commandes/mois (une commande génère 2 à 4 emails).
 * Le reliquat marketing est reporté au lendemain par la passe de drainage —
 * rien n'est perdu, seulement étalé.
 *
 * ⚠️ Si un second émetteur marketing est réactivé (`review-request`, dormant),
 * il DOIT partager ce budget et non en ouvrir un second.
 */
export const MARKETING_DAILY_EMAIL_BUDGET = 40;
