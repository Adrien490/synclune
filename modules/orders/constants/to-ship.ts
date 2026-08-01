// `prisma/enums` et NON `prisma/client` : ce module est dans le graphe CLIENT
// (`navigation-config`, `dashboard-kpis`, `orders-filter-drawer`). Le client généré
// importe `node:module`, ce qui fait ÉCHOUER le build dès qu'il atterrit dans un
// chunk navigateur. `enums.ts` est un objet gelé sans aucune dépendance Node.
import { FulfillmentStatus, OrderStatus } from "@/app/generated/prisma/enums";
import { SHIPPABLE_PAYMENT_STATUSES } from "./revenue-status.constants";
import { ROUTES } from "@/shared/constants/urls";

/**
 * SSOT de la file « à expédier » — définition unique partagée par :
 *  - la pastille `orders` de la navigation (`getAdminNavBadges`) ;
 *  - le KPI « À expédier » du tableau de bord (`getKpis`) ;
 *  - le lien profond vers la liste filtrée (`ORDERS_TO_SHIP_HREF`).
 *
 * **Ce fichier est client-safe** : il ne porte que les dimensions du prédicat et
 * leur miroir en query-string. La clause `where` Prisma vit dans
 * `services/to-ship.service.ts` (elle a besoin de `notDeleted`, donc du client
 * Prisma). Les deux dérivent des mêmes constantes ci-dessous : la divergence que
 * ce SSOT prévient reste impossible.
 *
 * **Pourquoi.** Les deux compteurs divergeaient sur le même écran : la pastille
 * comptait `paymentStatus=PAID` + `fulfillmentStatus=UNFULFILLED` (+ hors annulées),
 * le KPI comptait `SHIPPABLE_PAYMENT_STATUSES` + `{UNFULFILLED, PROCESSING}` (sans
 * exclure les annulées). Un admin pouvait donc lire « 3 » dans la sidebar et « 5 »
 * sur le tableau de bord.
 *
 * La définition retenue est l'union des deux gardes justes :
 *  - `SHIPPABLE_PAYMENT_STATUSES` — une commande partiellement remboursée reste à
 *    expédier ; filtrer sur `PAID` seul la faisait disparaître de la file ;
 *  - `{UNFULFILLED, PROCESSING}` — « en préparation » n'est pas « expédié » ;
 *  - `status != CANCELLED` — une commande annulée ne s'expédie pas (garde que le
 *    KPI n'avait pas) ;
 *  - `notDeleted` — soft-delete.
 */
export const TO_SHIP_FULFILLMENT_STATUSES = [
	FulfillmentStatus.UNFULFILLED,
	FulfillmentStatus.PROCESSING,
] as const;

/**
 * Statut exclu de la file — une commande annulée ne s'expédie pas.
 *
 * Exporté pour que `buildToShipWhereClause()` (côté serveur) et
 * `TO_SHIP_ORDER_STATUSES` (miroir positif, côté client) expriment la même
 * exclusion sans la réécrire de leur côté.
 */
export const TO_SHIP_EXCLUDED_ORDER_STATUS = OrderStatus.CANCELLED;

/**
 * Miroir POSITIF de `status: { not: CANCELLED }`, pour la query-string.
 *
 * Dérivé de l'enum plutôt qu'écrit en dur : ajouter une valeur à `OrderStatus`
 * l'inclut automatiquement, ce qui est le comportement voulu — seule `CANCELLED`
 * est exclue de la file.
 */
const TO_SHIP_ORDER_STATUSES = Object.values(OrderStatus).filter(
	(status) => status !== TO_SHIP_EXCLUDED_ORDER_STATUS,
);

/**
 * Lien profond vers la liste des commandes pré-filtrée sur la file « à expédier ».
 *
 * Miroir en query-string de `buildToShipWhereClause()` — `parseFilters` accepte les
 * paramètres répétés, le schéma et le query-builder acceptent `T | T[]`.
 *
 * Les trois dimensions du prédicat sont reproduites, `status` incluse. Elle était
 * omise, au motif qu'« une commande annulée n'est jamais `UNFULFILLED`/`PROCESSING`
 * en pratique (l'annulation repasse le fulfillment à `CANCELLED`) » — faux sur les
 * deux points : `FulfillmentStatus` n'a pas de membre `CANCELLED`, et
 * `cancel-order.ts` n'écrit jamais `fulfillmentStatus`. Or `order-query-builder`
 * n'exclut que `PENDING` en l'absence de `filter_status` : annuler une commande
 * déjà partiellement remboursée laisse `(CANCELLED, PARTIALLY_REFUNDED, PROCESSING)`,
 * que la pastille ne comptait pas mais que la liste affichait — d'où un badge « N »
 * ouvrant sur N+1 lignes.
 *
 * Sans ce lien, la pastille « Commandes 3 » et le KPI « À expédier » menaient à la
 * liste NON filtrée : l'admin devait repérer à l'œil les lignes à traiter.
 */
export const ORDERS_TO_SHIP_HREF = (() => {
	const params = new URLSearchParams();
	appendToShipParams(params);
	return `${ROUTES.ADMIN.ORDERS}?${params.toString()}`;
})();

/**
 * Écrit les paramètres du preset « à expédier » sur `params`.
 *
 * Applier partagé par `ORDERS_TO_SHIP_HREF` (pastille + KPI) et le tiroir de
 * filtres mobile, qui construisaient chacun la query-string de leur côté et
 * omettaient tous deux la dimension `status`. `append` et non `set` : les trois
 * dimensions sont multi-valeurs.
 */
export function appendToShipParams(params: URLSearchParams): void {
	for (const status of SHIPPABLE_PAYMENT_STATUSES) params.append("filter_paymentStatus", status);
	for (const status of TO_SHIP_FULFILLMENT_STATUSES) {
		params.append("filter_fulfillmentStatus", status);
	}
	for (const status of TO_SHIP_ORDER_STATUSES) params.append("filter_status", status);
}
