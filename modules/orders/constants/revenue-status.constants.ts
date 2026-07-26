// `prisma/enums` et NON `prisma/client` : ce module est consommé par des composants
// clients (tiroir de filtres commandes, via `to-ship`). Le client généré importe
// `node:module` et casse le build s'il atterrit dans un chunk navigateur.
import { PaymentStatus } from "@/app/generated/prisma/enums";

/**
 * Statuts de paiement représentant un encaissement effectif (CA cash-basis,
 * Art. 50-0 CGI).
 *
 * ⚠️ Inclut volontairement `PARTIALLY_REFUNDED` et `REFUNDED` : une commande
 * remboursée (partiellement ou totalement) **a bien été encaissée**. Le webhook
 * `charge.refunded` (`updateOrderPaymentStatus`) bascule le statut de `PAID` vers
 * `PARTIALLY_REFUNDED`/`REFUNDED` ; filtrer strictement sur `PAID` ferait
 * disparaître la commande de tout le CA (on perdrait le montant total, pas
 * seulement le remboursement). Les remboursements sont déduits **séparément**
 * (somme `Refund.amount` COMPLETED) pour obtenir le CA net.
 *
 * Toute requête de chiffre d'affaires (KPIs, chart, top produits, VAT, CSV
 * recettes) DOIT utiliser ce filtre — voir ANALYTICS-AUDIT-001.
 */
export const PAID_REVENUE_STATUSES = [
	PaymentStatus.PAID,
	PaymentStatus.PARTIALLY_REFUNDED,
	PaymentStatus.REFUNDED,
] as const;

/**
 * Statuts d'une commande dont l'argent est encore (au moins partiellement)
 * acquis et qui peut donc nécessiter une expédition : exclut `REFUNDED`
 * (totalement remboursée → plus rien à expédier).
 */
export const SHIPPABLE_PAYMENT_STATUSES = [
	PaymentStatus.PAID,
	PaymentStatus.PARTIALLY_REFUNDED,
] as const;
