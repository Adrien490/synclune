import type { Prisma } from "@/app/generated/prisma/client";
import { notDeleted } from "@/shared/lib/prisma";
import { SHIPPABLE_PAYMENT_STATUSES } from "../constants/revenue-status.constants";
import { TO_SHIP_EXCLUDED_ORDER_STATUS, TO_SHIP_FULFILLMENT_STATUSES } from "../constants/to-ship";

/**
 * Clause `where` Prisma de la file « à expédier ».
 *
 * **Pourquoi ici et pas dans `constants/to-ship.ts`** — le prédicat a besoin de
 * `notDeleted`, donc de `shared/lib/prisma`, donc du client Prisma généré, qui
 * importe `node:module`. Or `constants/to-ship.ts` est consommé par des composants
 * clients (pastille de navigation, KPI, tiroir de filtres) : garder les deux dans
 * le même fichier faisait atterrir le client Prisma dans un chunk navigateur et
 * **cassait le build**. La séparation est aussi celle de la matrice de décision des
 * couches (construire une clause `where` → `services/`).
 *
 * Les dimensions viennent des constantes partagées avec le miroir query-string
 * (`ORDERS_TO_SHIP_HREF`), donc les deux surfaces ne peuvent pas diverger.
 */
export function buildToShipWhereClause(): Prisma.OrderWhereInput {
	return {
		...notDeleted,
		paymentStatus: { in: [...SHIPPABLE_PAYMENT_STATUSES] },
		fulfillmentStatus: { in: [...TO_SHIP_FULFILLMENT_STATUSES] },
		status: { not: TO_SHIP_EXCLUDED_ORDER_STATUS },
	};
}
