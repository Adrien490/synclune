/**
 * Id de l'alerte « Des prix ont changé » (`CartPriceChangeAlert`), quand au moins
 * une hausse est en attente d'actualisation.
 *
 * Module pur (même motif que `stock-issues-alert-id.ts`) : `CartPriceChangeAlert`
 * POSE l'id, `CartSheetFooter` le CIBLE — via `aria-describedby` sur le CTA bloqué,
 * et via le déplacement de focus au clic. Un littéral dupliqué laisserait la
 * description silencieusement pendante si l'un des deux changeait.
 */
export const PRICE_INCREASE_ALERT_ID = "price-increase-alert";
