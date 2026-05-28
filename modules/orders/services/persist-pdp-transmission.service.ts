import {
	HistorySource,
	OrderAction,
	PdpTransmissionStatus,
	TransmissionDirection,
	TransmissionLogStatus,
} from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import type {
	ProviderInvoiceStatus,
	SubmitInvoiceResult,
} from "@/modules/invoices/types/invoice-provider";

/**
 * Mappe le `ProviderInvoiceStatus` (type TS InvoiceProvider) sur l'enum Prisma
 * `PdpTransmissionStatus`. La correspondance est strict — chaque valeur TS doit
 * trouver son équivalent DB pour garantir une persistance sans perte.
 */
function mapProviderStatusToDb(status: ProviderInvoiceStatus): PdpTransmissionStatus {
	switch (status) {
		case "PENDING_SUBMISSION":
			return PdpTransmissionStatus.PENDING;
		case "SUBMITTED":
			return PdpTransmissionStatus.SENT;
		case "ACCEPTED":
			return PdpTransmissionStatus.ACCEPTED;
		case "REJECTED":
			return PdpTransmissionStatus.REJECTED;
		case "CANCELLED":
			return PdpTransmissionStatus.CANCELLED;
	}
}

function mapProviderStatusToAction(status: ProviderInvoiceStatus): OrderAction {
	switch (status) {
		case "PENDING_SUBMISSION":
		case "SUBMITTED":
			return OrderAction.PDP_SUBMITTED;
		case "ACCEPTED":
			return OrderAction.PDP_ACCEPTED;
		case "REJECTED":
			return OrderAction.PDP_REJECTED;
		case "CANCELLED":
			return OrderAction.PDP_CANCELLED;
	}
}

export interface PersistPdpSubmissionInput {
	orderId: string;
	providerName: string;
	result: SubmitInvoiceResult;
	/**
	 * Code structuré du rejet (filtrable par cron DLQ). Optionnel — utile sur
	 * REJECTED uniquement.
	 */
	errorCode?: string | null;
	/**
	 * Message libre du rejet ou de l'erreur.
	 */
	errorMessage?: string | null;
	/**
	 * Snapshot du payload échangé avec la plateforme (pour audit / rejeu).
	 */
	payloadSnapshot?: Record<string, unknown> | null;
}

export interface PersistPdpSubmissionResult {
	status: "PERSISTED" | "ALREADY_SET" | "ORDER_NOT_FOUND";
	pdpStatus: PdpTransmissionStatus;
	pdpProviderRef: string | null;
}

/**
 * Persiste le résultat d'un `provider.submitInvoice()` sur Order.
 *
 * Garanties :
 *  - **Idempotent** : si `pdpProviderRef` est déjà set sur l'order ET correspond
 *    au `providerInvoiceId` retourné, la fonction est no-op (retour
 *    `ALREADY_SET`).
 *  - **Atomique** : update Order + insert OrderHistory + insert
 *    InvoiceTransmissionLog dans la même transaction Prisma. Si l'audit
 *    trail échoue, l'update Order roll-back (cohérence stricte).
 *  - **Audit trail immuable** : une ligne `OrderHistory` (Art. L123-22) +
 *    une ligne `InvoiceTransmissionLog` (Art. 286 CGI) par appel.
 *  - **Pas de mutation directe** : aucune Server Action ne doit appeler
 *    `prisma.order.update({ data: { pdpStatus } })` — toujours via ce service
 *    (régression test `no-direct-pdp-status-write`).
 *
 * Réf. audit Phase 5 EINV-PROVIDER-001 + EINV-PROVIDER-002.
 */
export async function persistPdpTransmission(
	input: PersistPdpSubmissionInput,
): Promise<PersistPdpSubmissionResult> {
	const { orderId, providerName, result } = input;
	const dbStatus = mapProviderStatusToDb(result.status);
	const action = mapProviderStatusToAction(result.status);

	// Pre-check idempotence : lecture en dehors de la tx (la tx vérifie de nouveau
	// pour catcher la race window).
	const existing = await prisma.order.findUnique({
		where: { id: orderId },
		select: {
			invoiceNumber: true,
			pdpStatus: true,
			pdpProviderRef: true,
			pdpRetryCount: true,
		},
	});

	if (!existing) {
		logger.warn("persistPdpTransmission — order not found", {
			service: "persist-pdp-transmission",
			orderId,
		});
		return {
			status: "ORDER_NOT_FOUND",
			pdpStatus: dbStatus,
			pdpProviderRef: null,
		};
	}

	// Idempotence : si même provider/status/ref → no-op silencieux.
	const alreadyMatches =
		existing.pdpProviderRef === result.providerInvoiceId && existing.pdpStatus === dbStatus;
	if (alreadyMatches) {
		return {
			status: "ALREADY_SET",
			pdpStatus: dbStatus,
			pdpProviderRef: existing.pdpProviderRef,
		};
	}

	// Détermine les timestamps à poser selon la transition.
	const now = new Date();
	const dataUpdate: Record<string, unknown> = {
		pdpStatus: dbStatus,
		pdpProviderRef: result.providerInvoiceId,
		pdpProviderName: providerName,
		pdpRejectionCode: input.errorCode ?? null,
		pdpRejectionReason: input.errorMessage ?? null,
	};

	if (dbStatus === PdpTransmissionStatus.SENT) {
		dataUpdate.pdpTransmittedAt = result.submittedAt;
	}
	if (dbStatus === PdpTransmissionStatus.ACCEPTED) {
		dataUpdate.pdpAcceptedAt = now;
	}
	if (dbStatus === PdpTransmissionStatus.REJECTED) {
		dataUpdate.pdpRejectedAt = now;
	}

	const isRetryAttempt = existing.pdpStatus === PdpTransmissionStatus.REJECTED;
	if (isRetryAttempt) {
		dataUpdate.pdpRetryCount = existing.pdpRetryCount + 1;
		dataUpdate.pdpLastRetryAt = now;
	}

	const transmissionLogStatus =
		dbStatus === PdpTransmissionStatus.REJECTED
			? TransmissionLogStatus.FAILED
			: TransmissionLogStatus.SUCCESS;

	await prisma.$transaction(async (tx) => {
		// Re-check idempotence sous lock (race window post pre-check).
		const guard = await tx.order.findUnique({
			where: { id: orderId },
			select: { pdpProviderRef: true, pdpStatus: true },
		});
		if (guard?.pdpProviderRef === result.providerInvoiceId && guard.pdpStatus === dbStatus) {
			return;
		}

		await tx.order.update({
			where: { id: orderId },
			data: dataUpdate,
		});

		await tx.orderHistory.create({
			data: {
				orderId,
				action,
				source: HistorySource.SYSTEM,
				authorName: `Système (persist-pdp-transmission/${providerName})`,
				note: `PDP ${providerName} → ${dbStatus}${result.providerInvoiceId ? ` (ref ${result.providerInvoiceId})` : ""}`,
				metadata: {
					providerName,
					providerInvoiceId: result.providerInvoiceId,
					providerStatus: result.status,
					submittedAt: result.submittedAt.toISOString(),
					...(input.errorCode ? { errorCode: input.errorCode } : {}),
					...(input.errorMessage ? { errorMessage: input.errorMessage.slice(0, 500) } : {}),
				},
			},
		});

		await tx.invoiceTransmissionLog.create({
			data: {
				orderId,
				provider: providerName,
				direction: TransmissionDirection.OUTBOUND,
				status: transmissionLogStatus,
				attempt: existing.pdpRetryCount + 1,
				invoiceNumber: existing.invoiceNumber,
				providerInvoiceId: result.providerInvoiceId,
				errorCode: input.errorCode ?? null,
				errorMessage: input.errorMessage ?? null,
				payloadSnapshot: input.payloadSnapshot ? (input.payloadSnapshot as object) : undefined,
			},
		});
	});

	logger.info(`PDP transmission persisted — order ${orderId} → ${dbStatus} via ${providerName}`, {
		service: "persist-pdp-transmission",
		orderId,
		provider: providerName,
		pdpStatus: dbStatus,
		providerInvoiceId: result.providerInvoiceId,
		retryAttempt: isRetryAttempt,
	});

	return {
		status: "PERSISTED",
		pdpStatus: dbStatus,
		pdpProviderRef: result.providerInvoiceId,
	};
}
