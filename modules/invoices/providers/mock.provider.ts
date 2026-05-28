import type {
	EReportingBatchPayload,
	InvoiceProvider,
	SubmitEReportingBatchResult,
} from "../types/invoice-provider";

/**
 * Provider en mémoire — usage dual :
 *  1. **Tests cross-modules** (cron) via `setInvoiceProviderForTests(new MockProvider())`.
 *  2. **Staging / CI E2E** via `INVOICE_PROVIDER=mock` (factory env-driven) pour
 *     valider l'orchestration e-reporting end-to-end sans contracter de PA réelle.
 *
 * **Ne jamais importer directement en code prod** — toujours passer par
 * `getInvoiceProvider()`. Le factory loggue un warning Sentry si `mock` est
 * activé en production (cf. `factory.ts`).
 */
export class MockProvider implements InvoiceProvider {
	readonly id = "mock";
	readonly capabilities = {
		eReporting: true,
	} as const;

	/**
	 * Dernière `idempotencyKey` reçue par `submitEReportingBatch` — exposée pour
	 * les tests de contrat (EINV-EREPORT-003) qui vérifient que le caller propage
	 * bien la clé.
	 */
	lastBatchIdempotencyKey: string | null = null;

	resetForTests(): void {
		this.lastBatchIdempotencyKey = null;
	}

	async submitEReportingBatch(input: {
		batch: EReportingBatchPayload;
		idempotencyKey: string;
	}): Promise<SubmitEReportingBatchResult> {
		this.lastBatchIdempotencyKey = input.idempotencyKey;
		// EINV-EREPORT-003 : providerBatchId dérivé déterministiquement de la clé
		// d'idempotence (= EReportingBatch.id) → un re-submit du même batch renvoie
		// le même id, ce qui modélise la déduplication exigée d'une PA réelle.
		return {
			providerBatchId: `mock:batch:${input.idempotencyKey}`,
			status: "SENT",
			submittedAt: new Date(),
		};
	}
}
