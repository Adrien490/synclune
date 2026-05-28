import type { InvoiceProvider, SubmitEReportingBatchResult } from "../types/invoice-provider";

/**
 * Provider par défaut B2C : aucune Plateforme Agréée n'est branchée. La facture
 * vit en local (PDF archivé UploadThing + SHA-256, Art. L102 B LPF) et
 * l'e-reporting reste en dry-run.
 *
 * Quand Synclune signera avec une PA pour l'e-reporting B2C (réforme 2026-2027),
 * basculer `INVOICE_PROVIDER` vers le provider concret.
 */
export class LocalPdfProvider implements InvoiceProvider {
	readonly id = "local";
	readonly capabilities = {
		eReporting: false,
	} as const;

	async submitEReportingBatch(): Promise<SubmitEReportingBatchResult> {
		// Dry-run silencieux : la capability `eReporting: false` signale au caller
		// qu'il doit skip. Retourner un PENDING permet à la chaîne d'orchestration
		// (cron transmit-ereporting-batch) de tester end-to-end sans crasher la
		// pipeline lors d'une activation accidentelle de INVOICE_ENABLE_EREPORTING
		// avec INVOICE_PROVIDER=local.
		return {
			providerBatchId: `local:dry-run:${crypto.randomUUID()}`,
			status: "PENDING",
			submittedAt: new Date(),
		};
	}
}
