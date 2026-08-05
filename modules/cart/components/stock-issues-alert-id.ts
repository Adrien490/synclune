/**
 * Id de l'alerte « Ajuste ton panier pour continuer », rendue par `CartSheet` quand une
 * ligne est en rupture ou indisponible.
 *
 * Module pur (même motif que `clear-cart-dialog-id.ts`) : il est importé par `CartSheet`
 * qui POSE l'id, et par `CartSheetFooter` qui le CIBLE — via `aria-describedby` sur le CTA
 * bloqué, et via le déplacement de focus au clic. Un littéral dupliqué dans les deux
 * fichiers laisserait la description silencieusement pendante si l'un des deux changeait :
 * `aria-describedby` vers un id inexistant n'émet aucune erreur, la description disparaît
 * simplement.
 *
 * ⚠️ Ne PAS le ranger dans `modules/cart/constants/cart.ts` : ce fichier importe les types
 * Prisma du client navigateur, et le tirer depuis un composant client fait entrer Prisma
 * dans un chunk navigateur — cause d'échec de build invisible au lint et au typecheck.
 */
export const STOCK_ISSUES_ALERT_ID = "stock-issues-alert";
