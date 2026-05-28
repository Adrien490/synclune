import type { Prisma } from "@/app/generated/prisma/client";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";
import type { InvoiceData } from "../types/invoice-data";
import { buildInvoiceData } from "./build-invoice-data";
import { verifyInvoiceSnapshot } from "./verify-invoice-snapshot";

/**
 * Source figée optionnelle, quand l'appelant a sélectionné le snapshot via une
 * requête dédiée plutôt que via `GET_ORDER_SELECT_ADMIN` (cas de la route
 * `/api/orders/[orderNumber]/invoice` qui charge l'order en `GET_ORDER_SELECT_CUSTOMER`
 * pour la minimisation, puis fait un select ciblé `invoiceDataSnapshot/Hash`).
 */
interface FrozenInvoiceSource {
	invoiceDataSnapshot?: Prisma.JsonValue | null;
	invoiceDataHash?: string | null;
}

/**
 * Résout l'`InvoiceData` à passer aux renderers (PDF / Factur-X / UBL).
 *
 * EINV-PDF-001 : **préfère TOUJOURS le snapshot figé** (`invoiceDataSnapshot`)
 * à une recomputation depuis les colonnes Order. Le snapshot EST la facture
 * comptable (Art. L102 B LPF) ; toute dérive future de `buildInvoiceData`
 * (refactor, nouveau champ, changement de `select`) ou des variables d'env
 * vendeur ne doit jamais altérer une facture historique.
 *
 * EINV-PDF-003 : quand un snapshot est présent, on délègue à `verifyInvoiceSnapshot`
 * qui re-canonicalise + compare le SHA-256 au `invoiceDataHash` figé. Un mismatch
 * lève `InvoiceSnapshotIntegrityError` — on refuse de rendre un document falsifié
 * plutôt que de servir une facture divergente.
 *
 * Fallback legacy : si aucun snapshot (factures émises avant l'introduction du
 * snapshot, en attente de backfill par `reconcile-invoices`), on recompose via
 * `buildInvoiceData(order)` — best-effort, non figé. Le cron de backfill
 * (EINV-PDF-005) résorbe progressivement ce cas.
 */
export function resolveInvoiceDataForRender(
	order: GetOrderReturn,
	frozen?: FrozenInvoiceSource,
): InvoiceData {
	const withSnapshot = order as GetOrderReturn & FrozenInvoiceSource;
	const snapshot = frozen?.invoiceDataSnapshot ?? withSnapshot.invoiceDataSnapshot ?? null;
	const expectedHash = frozen?.invoiceDataHash ?? withSnapshot.invoiceDataHash ?? null;

	if (snapshot != null) {
		return verifyInvoiceSnapshot(order.id, snapshot, expectedHash).invoiceData;
	}

	return buildInvoiceData(order);
}
