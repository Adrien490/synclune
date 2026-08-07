import { revalidateTagsInBackground } from "@/shared/lib/cache";
import * as Sentry from "@sentry/nextjs";
import {
	HistorySource,
	PaymentStatus,
	InvoiceStatus,
	RefundStatus,
} from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getParisDateParts } from "@/shared/utils/timezone";
import { BATCH_DEADLINE_MS, BATCH_SIZE_MEDIUM } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";
import { checkSequenceContinuity } from "@/modules/invoices/services/check-sequence-continuity.service";
import { persistInvoiceNumber } from "@/modules/orders/services/persist-invoice-number.service";
import { archiveInvoicePdf } from "@/modules/orders/services/archive-invoice-pdf.service";
import { ensureOrderCreditNoteArchived } from "@/modules/orders/services/ensure-credit-note-archived.service";
import { ensureRefundCreditNoteArchived } from "@/modules/refunds/services/ensure-credit-note-archived.service";
import { voidInvoice } from "@/modules/orders/services/void-invoice.service";
import { buildInvoiceData } from "@/modules/invoices/services/build-invoice-data";
import { renderInvoicePdf } from "@/modules/invoices/services/render-invoice-pdf";
import { GET_ORDER_SELECT_ADMIN } from "@/modules/orders/constants/order.constants";
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";

const CRON_JOB = "reconcile-invoices";
const MIN_AGE_MS = 6 * 60 * 60 * 1000; // 6h quarantine — eager path a sa chance

interface ReconcileBreakdown {
	invoiceNumberRecovered: number;
	pdfArchiveRecovered: number;
	creditNoteRecovered: number;
	/** EINV-CREDIT-020 — PDF avoir full-void (Order) archivé en rattrapage. */
	creditNotePdfRecovered: number;
	/** EINV-CREDIT-020 — PDF avoir partiel (Refund) archivé en rattrapage. */
	refundCreditNotePdfRecovered: number;
	/** EINV-SEQ-007 — nombre d'anomalies de continuité de séquence détectées (Art. 286 CGI). */
	continuityIssues: number;
}

/**
 * DLQ facturation (audit monitoring 2026-05-28 EINV-OPS-004).
 *
 * Cron daily 02:00 qui rattrape les Orders en état pathologique :
 *   1. PAID + invoiceNumber NULL + paidAt > 6h → persistInvoiceNumber
 *   2. invoiceNumber + invoicePdfUrl NULL → archiveInvoicePdf
 *      ⚠️ Régénère le PDF depuis les colonnes **VIVANTES** d'`Order`, pas depuis un
 *      snapshot : `invoiceDataSnapshot` a été retiré le 2026-08-05, le seul artefact
 *      conservé est le PDF lui-même. C'est ce qui rend cette passe capable de sceller
 *      une adresse modifiée APRÈS l'émission — d'où la garde « facture numérotée sans
 *      archive » d'`update-order-shipping-address.ts` (audit invariant 5, 2026-08-07).
 *   3. REFUNDED + invoiceStatus GENERATED + creditNoteNumber NULL → voidInvoice
 *   3b. creditNoteNumber + creditNotePdfUrl NULL → ensureOrderCreditNoteArchived (EINV-CREDIT-020)
 * Puis les passes globales : 4 (continuité séquences) et 7 (PDF avoirs Refund
 * manquants, EINV-CREDIT-020). La passe 8 « intégrité proactive des PDF
 * archivés » a été retirée (cf. le commentaire à son ancien emplacement).
 *
 * Sélection : `invoiceRetryDeferred=true` (DLQ) OU avoir émis sans PDF archivé.
 * Pas de compteur de tentatives ni d'escalade : l'admin est alertée dès l'échec
 * par `flagInvoiceFailureForReconcile`, et l'anomalie reste visible dans l'écran
 * Facturation tant que le drapeau est posé.
 *
 * Reset `invoiceRetryDeferred=false` automatique après une passe entièrement
 * réussie (les services sous-jacents reflagment si besoin sur erreur future).
 */
export async function reconcileInvoices(): Promise<CronResult & ReconcileBreakdown> {
	logger.info("Starting invoice reconciliation", { cronJob: CRON_JOB });

	const now = Date.now();
	const minAge = new Date(now - MIN_AGE_MS);

	const candidates = await prisma.order.findMany({
		where: {
			AND: [
				{
					OR: [
						// DLQ : anomalie facturation déjà flaguée.
						{ invoiceRetryDeferred: true },
						// EINV-CREDIT-020 : avoir full-void émis mais PDF jamais archivé
						// (crash entre la tx voidInvoice et l'archivage eager, ou échec
						// d'upload jamais flagué). Sans cette sélection directe, seul le
						// flag DLQ ramenait ces commandes — un avoir non archivé est une
						// fenêtre de matérialisation dégradée post-anonymisation RGPD.
						{
							creditNoteNumber: { not: null },
							creditNotePdfUrl: null,
						},
					],
				},
				{ OR: [{ paidAt: { lt: minAge } }, { paidAt: null }] },
				// F3 (RGPD-PII-AUDIT 2026-05-30) : exclure les commandes dont la PII a été
				// purgée à 10 ans (hard-delete-retention pose `piiPurgedAt` + met
				// `invoiceDataSnapshot = DbNull`). Sans cette garde, la Passe 2 régénérerait
				// un PDF depuis les colonnes Order désormais scrubées
				// (« Client supprimé »/« Adresse supprimée ») → archive corrompue divergeant
				// de la facture d'origine (atteinte intégrité Art. L102 B LPF). La facture
				// n'est plus reconstituable après purge (base légale expirée) : on n'y touche plus.
				{ piiPurgedAt: null },
			],
			...notDeleted,
		},
		select: GET_ORDER_SELECT_ADMIN,
		take: BATCH_SIZE_MEDIUM,
		orderBy: { paidAt: "asc" },
	});

	logger.info("Found invoice reconcile candidates", {
		cronJob: CRON_JOB,
		count: candidates.length,
	});

	let processed = 0;
	let errored = 0;
	let skipped = 0;
	const breakdown: ReconcileBreakdown = {
		invoiceNumberRecovered: 0,
		pdfArchiveRecovered: 0,
		creditNoteRecovered: 0,
		creditNotePdfRecovered: 0,
		refundCreditNotePdfRecovered: 0,
		continuityIssues: 0,
	};
	const deadline = Date.now() + BATCH_DEADLINE_MS;
	const tagsToInvalidate = new Set<string>();

	for (const order of candidates) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", { cronJob: CRON_JOB });
			break;
		}

		try {
			const recovered = await reconcileOrder(order);
			if (recovered.kind === "recovered") {
				processed++;
				if (recovered.invoiceNumberRecovered) breakdown.invoiceNumberRecovered++;
				if (recovered.pdfArchiveRecovered) breakdown.pdfArchiveRecovered++;
				if (recovered.creditNoteRecovered) breakdown.creditNoteRecovered++;
				if (recovered.creditNotePdfRecovered) breakdown.creditNotePdfRecovered++;
				for (const tag of getOrderInvalidationTags(order.id)) {
					tagsToInvalidate.add(tag);
				}
			} else if (recovered.kind === "failed") {
				errored++;
			} else {
				skipped++;
			}
		} catch (e) {
			logger.error("Error reconciling invoice", e, {
				cronJob: CRON_JOB,
				orderId: order.id,
				orderNumber: order.orderNumber,
			});
			errored++;
		}
	}

	revalidateTagsInBackground(tagsToInvalidate);

	// Passe 4 (EINV-SEQ-007) : contrôle de continuité gap-free — défense en
	// profondeur Art. 286 CGI. Lecture seule, hors deadline batch (2 requêtes
	// légères), jamais bloquant. Détecte trous + doublons que la construction
	// MAX+1-sous-lock est censée empêcher. Années couvertes : courante + N-1
	// jusqu'à fin mars (période de clôture comptable où des avoirs N-1 sortent).
	breakdown.continuityIssues = await runContinuityCheck(now);

	// Passe 7 (EINV-CREDIT-020) : avoirs partiels (Refund) émis mais PDF jamais
	// archivé — symétrie de la sélection Order `creditNoteNumber + creditNotePdfUrl
	// NULL` du batch principal. Ferme la fenêtre de matérialisation dégradée
	// post-anonymisation RGPD (avoir sans identité client, Art. 289 CGI).
	breakdown.refundCreditNotePdfRecovered = await runRefundCreditNotePdfSweep(deadline);

	// Il n'y a PLUS de passe 8 « intégrité PDF » (audit du module orders,
	// 2026-08-05). Elle re-téléchargeait et re-hashait chaque artefact archivé tous
	// les ~30 jours pour détecter une corruption UploadThing avant qu'un
	// téléchargement ne la révèle.
	//
	// ⚠️ Ce qui garantit l'Art. L102 B n'a PAS bougé : c'est le SHA-256 stocké
	// (`invoicePdfHash` / `creditNotePdfHash`), et il est re-vérifié à CHAQUE
	// téléchargement par les routes facture/avoir (EINV-PDF-006). La passe ne
	// faisait qu'avancer la détection, sur un corpus de ~240 documents/an que
	// personne ne surveille entre deux téléchargements — au prix de 368 lignes, de
	// deux colonnes-curseurs et d'un re-download intégral mensuel.
	//
	// La rouvrir demanderait d'abord de répondre à « qui lit le résultat ? ».

	logger.info("Invoice reconciliation completed", {
		cronJob: CRON_JOB,
		processed,
		errored,
		skipped,
		...breakdown,
	});

	return {
		processed,
		errored,
		skipped,
		hasMore: candidates.length === BATCH_SIZE_MEDIUM,
		...breakdown,
	};
}

export type ReconcileOutcome =
	| {
			kind: "recovered";
			invoiceNumberRecovered: boolean;
			pdfArchiveRecovered: boolean;
			creditNoteRecovered: boolean;
			creditNotePdfRecovered: boolean;
	  }
	/**
	 * Une des étapes de rattrapage a échoué sur cette passe. Distinct de
	 * `skipped` (« rien à faire, commande saine ») : le bouton « Relancer » de
	 * l'écran Facturation doit dire à Léane que ça a échoué, pas que tout va bien.
	 * Ne porte plus de compteur de tentatives — cf. `reconcileOrder`.
	 */
	| { kind: "failed" }
	| { kind: "skipped" };

/**
 * Variante 1-order utilisée par la Server Action "Relancer" du dashboard admin
 * (`/admin/ventes/facturation`). Charge l'order et exécute la même logique
 * que la passe batch du cron. Cf. EINV-OPS-007.
 */
export async function reconcileInvoiceOrder(orderId: string): Promise<ReconcileOutcome> {
	const order = await prisma.order.findUnique({
		where: { id: orderId },
		select: GET_ORDER_SELECT_ADMIN,
	});
	if (!order) return { kind: "skipped" };
	return reconcileOrder(order as GetOrderReturn);
}

async function reconcileOrder(order: GetOrderReturn): Promise<ReconcileOutcome> {
	let invoiceNumberRecovered = false;
	let pdfArchiveRecovered = false;
	let creditNoteRecovered = false;
	let creditNotePdfRecovered = false;
	let anyFailure = false;

	// Passe 1 : invoiceNumber manquant
	if (!order.invoiceNumber && order.paymentStatus === PaymentStatus.PAID) {
		const result = await persistInvoiceNumber(order.id, {
			source: HistorySource.SYSTEM,
			authorName: "Système (reconcile-invoices)",
		});
		if (result) {
			invoiceNumberRecovered = true;
			order.invoiceNumber = result.invoiceNumber;
			order.invoiceStatus = InvoiceStatus.GENERATED;
			order.invoiceGeneratedAt = result.invoiceGeneratedAt;
		} else {
			anyFailure = true;
		}
	}

	// Passe 2 : invoicePdfUrl manquant (archive perdue)
	if (
		order.invoiceNumber &&
		!order.invoicePdfUrl &&
		order.invoiceStatus === InvoiceStatus.GENERATED
	) {
		try {
			// EINV-PDF-001 : rendre depuis le snapshot figé (Passe 0 l'a chargé en
			// mémoire si backfill, sinon il était déjà présent ; fallback legacy
			// uniquement si snapshot toujours absent).
			const pdf = renderInvoicePdf(buildInvoiceData(order));
			const archived = await archiveInvoicePdf(order.id, order.invoiceNumber, pdf);
			if (archived) {
				pdfArchiveRecovered = true;
			} else {
				anyFailure = true;
			}
		} catch (e) {
			logger.error("PDF re-archive threw during reconcile", e, {
				cronJob: CRON_JOB,
				orderId: order.id,
				invoiceNumber: order.invoiceNumber,
			});
			anyFailure = true;
		}
	}

	// Passe 3 : avoir manquant (REFUNDED mais invoice GENERATED + pas de creditNote)
	if (
		order.invoiceNumber &&
		order.paymentStatus === PaymentStatus.REFUNDED &&
		order.invoiceStatus === InvoiceStatus.GENERATED &&
		!order.creditNoteNumber
	) {
		const result = await voidInvoice({
			orderId: order.id,
			authorName: "Système (reconcile-invoices)",
			source: HistorySource.SYSTEM,
			reason: "Reconciliation cron — credit note missing post-refund",
		});
		if (result.kind === "voided") {
			creditNoteRecovered = true;
			// Recharge en mémoire pour que la Passe 3b voie l'avoir fraîchement émis
			// (voidInvoice archive déjà eagerly — la passe ne fera que constater).
			order.creditNoteNumber = result.creditNoteNumber;
		} else if (result.kind === "failed") {
			anyFailure = true;
		}
		// noop = facture déjà voided ou rien à voider → on laisse anyFailure=false
	}

	// Passe 3b (EINV-CREDIT-020) : avoir full-void émis mais PDF jamais archivé.
	// L'archivage est normalement eager dans voidInvoice ; cette passe rattrape un
	// crash post-tx ou un échec d'upload (flag DLQ posé par l'archiveur). Sans
	// archive, le premier rendu post-anonymisation RGPD produirait un avoir sans
	// identité client (Art. 289 CGI) figé comme référence immuable.
	if (order.creditNoteNumber) {
		const archiveState = await prisma.order.findUnique({
			where: { id: order.id },
			select: { creditNotePdfUrl: true },
		});
		if (archiveState && !archiveState.creditNotePdfUrl) {
			const status = await ensureOrderCreditNoteArchived(order.id);
			if (status === "archived") {
				creditNotePdfRecovered = true;
			} else if (status === "failed") {
				anyFailure = true;
			}
		}
	}

	if (anyFailure) {
		// Plus de compteur `invoiceReconcileAttempts` ni d'escalade au 3ᵉ échec
		// (audit du module orders, 2026-08-05).
		//
		// Ce que le compteur faisait réellement : RETARDER de trois jours la
		// première alerte. Au-delà du seuil il ré-alertait à chaque run, donc il ne
		// dédoublonnait rien — il ne tolérait que deux échecs transitoires.
		//
		// Or l'admin est déjà prévenue à J+0, au moment de l'échec, par
		// `flagInvoiceFailureForReconcile` (`sendAdminInvoiceFailedAlert`). Le
		// retard n'ajoutait donc aucun signal, et
		// l'anomalie reste visible en permanence dans l'écran Facturation via
		// `invoiceRetryDeferred`, qui LUI est conservé — c'est le prédicat
		// d'appartenance à la file, celui qui fait rejouer la commande demain.
		//
		// ⚠️ Réduction assumée : plus d'e-mail de rappel les jours suivants. Si une
		// facture non émise devait redevenir criante (Art. 289-I), le rétablir passe
		// par un rappel périodique — pas par un compteur en base.
		return { kind: "failed" };
	}

	if (
		!invoiceNumberRecovered &&
		!pdfArchiveRecovered &&
		!creditNoteRecovered &&
		!creditNotePdfRecovered
	) {
		// Rien à faire : drapeau posé sur une commande qui n'a finalement pas
		// d'anomalie (déjà rattrapée par lazy fallback). On le baisse.
		await prisma.order.update({
			where: { id: order.id },
			data: { invoiceRetryDeferred: false },
		});
		return { kind: "skipped" };
	}

	// Reset flags après succès complet + audit trail
	await prisma.order.update({
		where: { id: order.id },
		data: { invoiceRetryDeferred: false },
	});
	return {
		kind: "recovered",
		invoiceNumberRecovered,
		pdfArchiveRecovered,
		creditNoteRecovered,
		creditNotePdfRecovered,
	};
}

/**
 * EINV-SEQ-007 — contrôle de continuité gap-free (Art. 286 CGI). Lecture seule,
 * jamais bloquant : toute exception est avalée (le cœur du cron a déjà tourné).
 * Sentry fingerprinté par séquence+année + UNE alerte admin agrégée (l'idempotency
 * key horaire de `sendAdminCronFailedAlert` collapse de toute façon les envois du
 * même cron sur la même heure → on agrège pour ne pas perdre de détail).
 *
 * @returns nombre d'anomalies détectées (0 = séquences saines).
 */
async function runContinuityCheck(now: number): Promise<number> {
	try {
		const { year, month } = getParisDateParts(new Date(now));
		// month 0-indexé : 0=jan … 2=mars → couvre N-1 jusqu'au 31 mars.
		const years = month <= 2 ? [year, year - 1] : [year];

		const issues = await checkSequenceContinuity(years);
		if (issues.length === 0) return 0;

		for (const issue of issues) {
			logger.error("Sequence continuity breach detected", undefined, {
				cronJob: CRON_JOB,
				kind: issue.kind,
				year: issue.year,
				prefix: issue.prefix,
				max: issue.max,
				count: issue.count,
				missingCount: issue.missing.length,
				duplicateCount: issue.duplicates.length,
			});
			Sentry.withScope((scope) => {
				scope.setLevel("error");
				scope.setFingerprint(["invoice", "sequence-continuity", issue.kind, String(issue.year)]);
				scope.setContext("sequence-continuity", {
					kind: issue.kind,
					year: issue.year,
					prefix: issue.prefix,
					max: issue.max,
					count: issue.count,
					missing: issue.missing.slice(0, 50),
					duplicates: issue.duplicates.slice(0, 50),
				});
				Sentry.captureMessage(
					`Séquence ${issue.kind} ${issue.prefix} non-contiguë — ${issue.missing.length} trou(s), ${issue.duplicates.length} doublon(s) (Art. 286 CGI)`,
					"error",
				);
			});
		}

		await sendAdminCronFailedAlert({
			job: CRON_JOB,
			errors: issues.length,
			details: {
				type: "sequence-continuity-breach",
				issues: issues.map((i) => ({
					sequence: i.kind,
					year: i.year,
					prefix: i.prefix,
					max: i.max,
					count: i.count,
					missing: i.missing.slice(0, 50),
					duplicates: i.duplicates.slice(0, 50),
				})),
				action: "Trou/doublon de séquence légale (Art. 286 CGI) — investigation immédiate",
			},
		}).catch((alertError) =>
			logger.error("Failed to send continuity breach alert", alertError, { cronJob: CRON_JOB }),
		);

		return issues.length;
	} catch (e) {
		logger.error("Sequence continuity check threw", e, { cronJob: CRON_JOB });
		return 0;
	}
}

/**
 * Passe 7 (EINV-CREDIT-020) — avoirs partiels (Refund) émis mais PDF jamais
 * archivé. L'archivage est normalement eager dans `issueCreditNoteForRefund` ;
 * cette passe rattrape un crash post-tx ou un échec d'upload. Borné par
 * BATCH_SIZE_MEDIUM + la deadline batch. Jamais bloquant.
 *
 * @returns nombre d'avoirs Refund dont le PDF a été archivé.
 */
async function runRefundCreditNotePdfSweep(deadline: number): Promise<number> {
	try {
		const unarchived = await prisma.refund.findMany({
			where: {
				creditNoteNumber: { not: null },
				creditNotePdfUrl: null,
				status: RefundStatus.COMPLETED,
				// Post-purge 10 ans, l'avoir n'est plus reconstituable — on n'y touche plus.
				order: { piiPurgedAt: null },
			},
			select: { id: true },
			take: BATCH_SIZE_MEDIUM,
			orderBy: { creditNoteGeneratedAt: "asc" },
		});

		let recovered = 0;
		for (const refund of unarchived) {
			if (Date.now() > deadline) {
				logger.warn("Approaching timeout, stopping refund credit-note PDF sweep early", {
					cronJob: CRON_JOB,
				});
				break;
			}
			const status = await ensureRefundCreditNoteArchived(refund.id);
			if (status === "archived") {
				recovered++;
			}
			// "failed" : l'archiveur a déjà audité + alerté ; retenté au prochain run.
		}
		if (recovered > 0) {
			logger.info("Refund credit-note PDF backlog drained", { cronJob: CRON_JOB, recovered });
		}
		return recovered;
	} catch (e) {
		logger.error("Refund credit-note PDF sweep threw", e, { cronJob: CRON_JOB });
		return 0;
	}
}
