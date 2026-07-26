import { createHash } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { HistorySource, OrderAction } from "@/app/generated/prisma/client";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";
import { deleteUploadThingFileFromUrl } from "@/modules/media/services/delete-uploadthing-files.service";
import { GET_ORDER_SELECT_ADMIN } from "@/modules/orders/constants/order.constants";
import { renderOrderCreditNotePdf } from "@/modules/orders/services/render-order-credit-note.service";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";
import { createOrderAudit } from "@/modules/orders/utils/order-audit";
import { renderRefundCreditNotePdf } from "@/modules/refunds/services/render-refund-credit-note.service";
import { logger } from "@/shared/lib/logger";
import { isAllowedMediaDomain } from "@/shared/lib/media-validation";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { utapi } from "@/shared/lib/uploadthing";
import { renderInvoicePdf } from "./render-invoice-pdf";
import { resolveInvoiceDataForRender } from "./resolve-invoice-data";

const SERVICE = "verify-pdf-archive-integrity";
const FETCH_TIMEOUT_MS = 5_000;
/** Ré-audit de chaque artefact au plus tous les 30 jours (rotation par curseur). */
const RECHECK_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
/** Cap par run et par table — le cron daily couvre ainsi ~600 docs/mois par table. */
const BATCH_CAP = 20;

export interface PdfIntegrityReport {
	/** Artefacts dont le hash a été re-vérifié (OK, réparé ou legacy sans hash). */
	checked: number;
	/** Artefacts corrompus réparés (régénération bit-identique ré-uploadée). */
	repaired: number;
	/** Artefacts corrompus NON réparables (régénération divergente) — alerte admin. */
	unrepaired: number;
	/** Fetchs UploadThing en échec (retentés au prochain run, curseur non avancé). */
	fetchFailed: number;
}

type ArtifactOutcome = "ok" | "no-hash" | "repaired" | "unrepaired" | "fetch-failed";

interface ArtifactParams {
	label: string;
	documentNumber: string;
	url: string;
	expectedHash: string | null;
	/** Régénère le document depuis le snapshot/SSOT de rendu. */
	regenerate: () => Promise<ArrayBuffer | null>;
	/** Persiste la nouvelle URL après ré-upload (le hash ne change JAMAIS). */
	replaceUrl: (newUrl: string) => Promise<void>;
	context: Record<string, string>;
}

/**
 * Contrôle d'intégrité PROACTIF des PDF archivés (Art. L102 B LPF) — passe
 * intégrité du cron `reconcile-invoices`.
 *
 * Les routes de téléchargement re-vérifient déjà le hash au serving
 * (EINV-PDF-006), mais un PDF jamais re-téléchargé pouvait rester corrompu des
 * années sans détection. Cette passe re-hash périodiquement chaque artefact
 * archivé (facture + avoir Order + avoir Refund) contre le hash DB, avec
 * rotation via `pdfIntegrityCheckedAt` (~30 j par artefact).
 *
 * Auto-réparation : sur mismatch, on régénère depuis le snapshot/SSOT de
 * rendu ; si la régénération est bit-identique au hash DB (cas nominal : seule
 * la copie UploadThing est corrompue), on ré-uploade et remplace l'URL — le
 * hash DB, preuve d'immutabilité, n'est JAMAIS réécrit. Si la régénération
 * diverge (template drift / données mutées), on N'ARCHIVE RIEN et on alerte
 * l'admin (intervention manuelle).
 *
 * Jamais bloquant : toute exception est avalée (le cœur du cron a déjà tourné).
 */
export async function verifyPdfArchiveIntegrity(deadline: number): Promise<PdfIntegrityReport> {
	const report: PdfIntegrityReport = { checked: 0, repaired: 0, unrepaired: 0, fetchFailed: 0 };
	const unrepairedDetails: Array<Record<string, string>> = [];

	try {
		const cutoff = new Date(Date.now() - RECHECK_INTERVAL_MS);

		// --- Orders : facture + avoir full-void ---
		const orders = await prisma.order.findMany({
			where: {
				piiPurgedAt: null,
				OR: [{ invoicePdfUrl: { not: null } }, { creditNotePdfUrl: { not: null } }],
				AND: [{ OR: [{ pdfIntegrityCheckedAt: null }, { pdfIntegrityCheckedAt: { lt: cutoff } }] }],
				...notDeleted,
			},
			select: {
				id: true,
				orderNumber: true,
				invoiceNumber: true,
				invoicePdfUrl: true,
				invoicePdfHash: true,
				creditNoteNumber: true,
				creditNotePdfUrl: true,
				creditNotePdfHash: true,
			},
			orderBy: { pdfIntegrityCheckedAt: { sort: "asc", nulls: "first" } },
			take: BATCH_CAP,
		});

		for (const order of orders) {
			if (Date.now() > deadline) break;

			const outcomes: ArtifactOutcome[] = [];

			if (order.invoicePdfUrl && order.invoiceNumber) {
				outcomes.push(
					await verifyArtifact({
						label: "invoice",
						documentNumber: order.invoiceNumber,
						url: order.invoicePdfUrl,
						expectedHash: order.invoicePdfHash,
						regenerate: async () => {
							// EINV-PDF-001 : régénération depuis le snapshot figé (banner VOIDED
							// exclu — il est injecté au serving sans muter le snapshot, donc
							// l'archive reste le rendu d'origine).
							const full = (await prisma.order.findUnique({
								where: { id: order.id },
								select: GET_ORDER_SELECT_ADMIN,
							})) as GetOrderReturn | null;
							if (!full) return null;
							return renderInvoicePdf(resolveInvoiceDataForRender(full));
						},
						replaceUrl: async (newUrl) => {
							await prisma.order.update({
								where: { id: order.id },
								data: { invoicePdfUrl: newUrl },
							});
						},
						context: { orderId: order.id, orderNumber: order.orderNumber },
					}),
				);
			}

			if (order.creditNotePdfUrl && order.creditNoteNumber) {
				outcomes.push(
					await verifyArtifact({
						label: "credit-note",
						documentNumber: order.creditNoteNumber,
						url: order.creditNotePdfUrl,
						expectedHash: order.creditNotePdfHash,
						regenerate: async () => (await renderOrderCreditNotePdf(order.id))?.pdfBuffer ?? null,
						replaceUrl: async (newUrl) => {
							await prisma.order.update({
								where: { id: order.id },
								data: { creditNotePdfUrl: newUrl },
							});
						},
						context: { orderId: order.id, orderNumber: order.orderNumber },
					}),
				);
			}

			aggregate(report, outcomes, unrepairedDetails, {
				orderId: order.id,
				orderNumber: order.orderNumber,
			});

			// Curseur avancé UNIQUEMENT si tous les artefacts présents sont sains
			// (ok/réparé/legacy) — un fetch KO ou une corruption non réparée garde la
			// priorité au prochain run.
			if (outcomes.every((o) => o === "ok" || o === "no-hash" || o === "repaired")) {
				await prisma.order.update({
					where: { id: order.id },
					data: { pdfIntegrityCheckedAt: new Date() },
				});
			}
		}

		// --- Refunds : avoirs partiels ---
		const refunds = await prisma.refund.findMany({
			where: {
				creditNotePdfUrl: { not: null },
				deletedAt: null,
				order: { piiPurgedAt: null },
				OR: [{ pdfIntegrityCheckedAt: null }, { pdfIntegrityCheckedAt: { lt: cutoff } }],
			},
			select: {
				id: true,
				orderId: true,
				creditNoteNumber: true,
				creditNotePdfUrl: true,
				creditNotePdfHash: true,
			},
			orderBy: { pdfIntegrityCheckedAt: { sort: "asc", nulls: "first" } },
			take: BATCH_CAP,
		});

		for (const refund of refunds) {
			if (Date.now() > deadline) break;
			if (!refund.creditNotePdfUrl || !refund.creditNoteNumber) continue;

			const outcome = await verifyArtifact({
				label: "refund-credit-note",
				documentNumber: refund.creditNoteNumber,
				url: refund.creditNotePdfUrl,
				expectedHash: refund.creditNotePdfHash,
				regenerate: async () => (await renderRefundCreditNotePdf(refund.id))?.pdfBuffer ?? null,
				replaceUrl: async (newUrl) => {
					await prisma.refund.update({
						where: { id: refund.id },
						data: { creditNotePdfUrl: newUrl },
					});
				},
				context: { refundId: refund.id, orderId: refund.orderId },
			});

			aggregate(report, [outcome], unrepairedDetails, {
				refundId: refund.id,
				orderId: refund.orderId,
			});

			if (outcome === "ok" || outcome === "no-hash" || outcome === "repaired") {
				await prisma.refund.update({
					where: { id: refund.id },
					data: { pdfIntegrityCheckedAt: new Date() },
				});
			}
		}

		if (unrepairedDetails.length > 0) {
			await sendAdminCronFailedAlert({
				job: "reconcile-invoices:pdf-integrity",
				errors: unrepairedDetails.length,
				details: {
					type: "pdf-archive-integrity-breach",
					artifacts: unrepairedDetails.slice(0, 20),
					action:
						"PDF archivé corrompu ET régénération divergente (Art. L102 B LPF) — " +
						"investigation manuelle immédiate, voir docs/RUNBOOK.md § Intégrité PDF",
				},
			}).catch((alertError) =>
				logger.error("Failed to send pdf-integrity alert", alertError, { service: SERVICE }),
			);
		}
	} catch (e) {
		logger.error("verifyPdfArchiveIntegrity threw", e, { service: SERVICE });
	}

	return report;
}

function aggregate(
	report: PdfIntegrityReport,
	outcomes: ArtifactOutcome[],
	unrepairedDetails: Array<Record<string, string>>,
	context: Record<string, string>,
): void {
	for (const outcome of outcomes) {
		switch (outcome) {
			case "ok":
			case "no-hash":
				report.checked++;
				break;
			case "repaired":
				report.checked++;
				report.repaired++;
				break;
			case "unrepaired":
				report.unrepaired++;
				unrepairedDetails.push(context);
				break;
			case "fetch-failed":
				report.fetchFailed++;
				break;
		}
	}
}

async function verifyArtifact(params: ArtifactParams): Promise<ArtifactOutcome> {
	const { label, documentNumber, url, expectedHash, regenerate, replaceUrl, context } = params;

	// Archives legacy sans hash : rien à vérifier (assumé, cf. routes EINV-PDF-006).
	if (!expectedHash) {
		return "no-hash";
	}

	if (!isAllowedMediaDomain(url)) {
		logger.error("Archived PDF URL host not whitelisted during integrity sweep", undefined, {
			service: SERVICE,
			label,
			documentNumber,
			...context,
		});
		return "unrepaired";
	}

	let bytes: Uint8Array;
	try {
		const response = await fetch(url, {
			cache: "no-store",
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		});
		if (!response.ok) {
			return "fetch-failed";
		}
		bytes = new Uint8Array(await response.arrayBuffer());
	} catch {
		return "fetch-failed";
	}

	const actualHash = createHash("sha256").update(bytes).digest("hex");
	if (actualHash === expectedHash) {
		return "ok";
	}

	// Corruption détectée — Sentry systématique, puis tentative d'auto-réparation.
	Sentry.captureMessage("pdf-archive-integrity-mismatch", {
		level: "error",
		fingerprint: ["pdf-integrity", label, documentNumber],
		tags: { service: SERVICE, artifact: label },
		extra: { documentNumber, expectedHash, actualHash, ...context },
	});
	logger.error("Archived PDF hash mismatch detected by integrity sweep", undefined, {
		service: SERVICE,
		label,
		documentNumber,
		expectedHash,
		actualHash,
		...context,
	});

	try {
		const regenerated = await regenerate();
		if (!regenerated) {
			return "unrepaired";
		}
		const regeneratedBytes = new Uint8Array(regenerated);
		const regeneratedHash = createHash("sha256").update(regeneratedBytes).digest("hex");
		// Le hash DB est la preuve d'immutabilité : on ne répare QUE si la
		// régénération lui est bit-identique. Toute divergence = intervention
		// manuelle (jamais d'écrasement du hash).
		if (regeneratedHash !== expectedHash) {
			return "unrepaired";
		}

		const blob = new Blob([regeneratedBytes as BlobPart], { type: "application/pdf" });
		const file = new File([blob], `${label}-${documentNumber}.pdf`, { type: "application/pdf" });
		const uploaded = await utapi.uploadFiles([file]);
		const data = uploaded[0]?.data;
		if (!data?.ufsUrl) {
			return "unrepaired";
		}

		await replaceUrl(data.ufsUrl);
		// Suppression best-effort de la copie corrompue (l'URL n'est plus référencée ;
		// cleanup-orphan-media ramasserait un éventuel raté).
		await deleteUploadThingFileFromUrl(url).catch(() => {});

		if (context.orderId) {
			await createOrderAudit({
				orderId: context.orderId,
				action:
					label === "invoice" ? OrderAction.INVOICE_ARCHIVED : OrderAction.CREDIT_NOTE_ARCHIVED,
				source: HistorySource.SYSTEM,
				authorName: "Système (pdf-integrity)",
				note: `Archive PDF ${documentNumber} corrompue sur UploadThing — réparée (régénération bit-identique au hash d'origine)`,
				metadata: { documentNumber, expectedHash, corruptedHash: actualHash, ...context },
			}).catch(() => {});
		}

		logger.info(`Archived PDF ${documentNumber} repaired (bit-identical regeneration)`, {
			service: SERVICE,
			label,
			...context,
		});
		return "repaired";
	} catch (e) {
		logger.error("PDF archive repair threw", e, { service: SERVICE, label, documentNumber });
		return "unrepaired";
	}
}
