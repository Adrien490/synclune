import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getInvoiceProvider } from "@/modules/invoices/providers/factory";
import { persistPdpTransmission } from "@/modules/orders/services/persist-pdp-transmission.service";
import { withDeadline } from "@/modules/invoices/services/submit-ereporting-batch.service";
import type { InvoiceData } from "@/modules/invoices/types/invoice-data";
import type { SubmitInvoiceResult } from "@/modules/invoices/types/invoice-provider";

/**
 * Orchestre la transmission B2B/B2G d'une facture individuelle vers la
 * plateforme agréée (PDP/PA) configurée via `INVOICE_PROVIDER`.
 *
 * Aujourd'hui no-op par défaut car `LocalPdfProvider.capabilities.submitInvoice = false`
 * (B2C franchise — aucune transmission requise). Sera activé Phase 5 quand
 * Synclune onboardera des clients B2B/B2G + signera une PDP.
 *
 * Cycle de vie typique :
 *  1. Webhook Stripe `payment_intent.succeeded` → invoiceNumber persisté + PDF
 *     archivé + XML généré + e-reporting B2C enregistré (existant).
 *  2. **Ce service** (futur : appelé par un cron `transmit-invoices` ou en
 *     post-webhook si customerType=B2B/B2G) → push la facture vers la PDP.
 *  3. Webhook PDP entrant → met à jour `Order.pdpStatus` vers ACCEPTED/REJECTED.
 *  4. Cron `retry-invoice-transmissions` → re-pousse les REJECTED/RETRYING.
 *
 * Garanties :
 *  - **Idempotent** : si `pdpProviderRef` déjà set et `pdpStatus ∈ {SENT, ACCEPTED}`
 *    → retour `ALREADY_SENT`, aucun appel provider.
 *  - **Capability-aware** : si `provider.capabilities.submitInvoice === false`
 *    → retour `SKIPPED_CAPABILITY_OFF` sans aucune query DB ni call provider.
 *  - **Best-effort** : aucune erreur ne re-throw — l'erreur est persistée via
 *    `persistPdpTransmission` (REJECTED + errorMessage), ce qui place l'order
 *    sous la couverture du cron `retry-invoice-transmissions`.
 *  - **Audit trail** : toute transition Order.pdpStatus passe par
 *    `persistPdpTransmission` (cf. invariant `no-direct-pdp-status-write`).
 *
 * Réf. Phase 5 EINV-PROVIDER-001.
 */

export type SubmitInvoiceByIdStatus =
	| "SKIPPED_CAPABILITY_OFF"
	| "ORDER_NOT_FOUND"
	| "NOT_INVOICED"
	| "NO_INVOICE_DATA_SNAPSHOT"
	| "ALREADY_SENT"
	| "SUBMITTED"
	| "REJECTED";

export interface SubmitInvoiceByIdResult {
	orderId: string;
	status: SubmitInvoiceByIdStatus;
	providerInvoiceId?: string;
	errorMessage?: string;
}

export interface SubmitInvoiceByIdOptions {
	/**
	 * Timestamp absolu (Date.now()) après lequel `withDeadline` annule la promise
	 * provider. Si omis, par défaut 30s à partir de l'appel.
	 */
	deadline?: number;
}

const DEFAULT_DEADLINE_MS = 30_000;

export async function submitInvoiceById(
	orderId: string,
	options: SubmitInvoiceByIdOptions = {},
): Promise<SubmitInvoiceByIdResult> {
	const provider = getInvoiceProvider();

	// Capability check AVANT la query DB pour économiser une lecture quand le
	// provider courant ne supporte pas la transmission (LocalPdfProvider).
	if (!provider.capabilities.submitInvoice) {
		logger.info("submitInvoiceById skipped — provider has no submitInvoice capability", {
			service: "submit-invoice-by-id",
			orderId,
			providerId: provider.id,
		});
		return { orderId, status: "SKIPPED_CAPABILITY_OFF" };
	}

	const order = await prisma.order.findUnique({
		where: { id: orderId },
		select: {
			id: true,
			invoiceNumber: true,
			invoiceDataSnapshot: true,
			invoicePdfUrl: true,
			invoiceXmlUrl: true,
			pdpStatus: true,
			pdpProviderRef: true,
		},
	});

	if (!order) {
		return { orderId, status: "ORDER_NOT_FOUND" };
	}

	if (!order.invoiceNumber) {
		return { orderId, status: "NOT_INVOICED" };
	}

	if (!order.invoiceDataSnapshot) {
		return { orderId, status: "NO_INVOICE_DATA_SNAPSHOT" };
	}

	// Idempotence : si déjà transmis avec ACK ou en attente d'ACK, no-op.
	const alreadyTransmitted =
		order.pdpProviderRef !== null && (order.pdpStatus === "SENT" || order.pdpStatus === "ACCEPTED");
	if (alreadyTransmitted) {
		return {
			orderId,
			status: "ALREADY_SENT",
			providerInvoiceId: order.pdpProviderRef ?? undefined,
		};
	}

	const deadline = options.deadline ?? Date.now() + DEFAULT_DEADLINE_MS;
	const invoiceData = order.invoiceDataSnapshot as unknown as InvoiceData;

	let pdfBuffer: ArrayBuffer | null = null;
	let xmlBuffer: ArrayBuffer | null = null;

	try {
		if (order.invoicePdfUrl) {
			pdfBuffer = await withDeadline(
				fetch(order.invoicePdfUrl).then((r) => r.arrayBuffer()),
				deadline,
				`fetch-pdf[${orderId}]`,
			);
		}
		if (order.invoiceXmlUrl) {
			xmlBuffer = await withDeadline(
				fetch(order.invoiceXmlUrl).then((r) => r.arrayBuffer()),
				deadline,
				`fetch-xml[${orderId}]`,
			);
		}
	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : String(e);
		logger.warn(`submitInvoiceById failed to fetch artifact buffers`, {
			service: "submit-invoice-by-id",
			orderId,
			error: errorMessage,
		});
		return await recordFailure(orderId, provider.id, errorMessage, "ARTIFACT_FETCH_FAILED");
	}

	let result: SubmitInvoiceResult;
	try {
		result = await withDeadline(
			provider.submitInvoice({ invoiceData, pdfBuffer, xmlBuffer }),
			deadline,
			`provider.submitInvoice[${orderId}]`,
		);
	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : String(e);
		Sentry.withScope((scope) => {
			scope.setTag("service", "submit-invoice-by-id");
			scope.setTag("orderId", orderId);
			scope.setTag("providerId", provider.id);
			scope.setFingerprint(["service", "submit-invoice-by-id", "provider-error"]);
			scope.setLevel("warning");
			Sentry.captureException(e instanceof Error ? e : new Error(errorMessage));
		});
		return await recordFailure(orderId, provider.id, errorMessage, "PROVIDER_THROW");
	}

	await persistPdpTransmission({
		orderId,
		providerName: provider.id,
		result,
	});

	logger.info(`submitInvoiceById — order ${orderId} transmitted → ${result.status}`, {
		service: "submit-invoice-by-id",
		orderId,
		providerId: provider.id,
		providerInvoiceId: result.providerInvoiceId,
	});

	if (result.status === "REJECTED") {
		return {
			orderId,
			status: "REJECTED",
			providerInvoiceId: result.providerInvoiceId,
		};
	}

	return {
		orderId,
		status: "SUBMITTED",
		providerInvoiceId: result.providerInvoiceId,
	};
}

/**
 * Persiste un échec de transmission via `persistPdpTransmission` avec un faux
 * `SubmitInvoiceResult` REJECTED. L'audit trail (`InvoiceTransmissionLog` +
 * `OrderHistory`) est créé et le cron `retry-invoice-transmissions` reprend
 * la main par la suite.
 *
 * Le `providerInvoiceId` est stable par orderId (`error:<orderId>`) pour ne
 * pas casser l'idempotence : un retry futur succès overwrite avec le vrai ID.
 */
async function recordFailure(
	orderId: string,
	providerName: string,
	errorMessage: string,
	errorCode: string,
): Promise<SubmitInvoiceByIdResult> {
	await persistPdpTransmission({
		orderId,
		providerName,
		result: {
			providerInvoiceId: `error:${orderId}`,
			status: "REJECTED",
			submittedAt: new Date(),
		},
		errorCode,
		errorMessage: errorMessage.slice(0, 1000),
	});
	return { orderId, status: "REJECTED", errorMessage };
}
