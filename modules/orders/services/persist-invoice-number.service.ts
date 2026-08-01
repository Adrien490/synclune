import { createHash } from "node:crypto";
import { Prisma, HistorySource, PaymentStatus } from "@/app/generated/prisma/client";
import type { VatRegime } from "@/app/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { BusinessError } from "@/shared/lib/actions/business-error";
import { prisma } from "@/shared/lib/prisma";
import {
	TX_TIMEOUT_LONG,
	TX_MAX_WAIT_LONG,
	RETRYABLE_SEQUENCE_TX_ERROR_CODES,
} from "@/shared/lib/prisma-tx-options";
import { logger } from "@/shared/lib/logger";
import { getVendorLegalInfo } from "@/shared/lib/stripe";
import { normalizeFiscalIdentifier } from "@/shared/schemas/b2b-identifiers.schema";
import { buildInvoiceData } from "@/modules/invoices/services/build-invoice-data";
import { invoiceDataSchema } from "@/modules/invoices/schemas/invoice.schema";
import { canonicalJsonStringify } from "@/modules/invoices/utils/canonical-json";
import { getParisDateParts } from "@/shared/utils/timezone";
import { revalidateTagsInBackground } from "@/shared/lib/cache";
import { sendAdminSequenceOverflowAlert } from "@/modules/emails/services/admin-emails";
import { GET_ORDER_SELECT_ADMIN } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { createOrderAuditTx } from "../utils/order-audit";
import type { GetOrderReturn } from "../types/order.types";

interface PersistInvoiceNumberResult {
	invoiceNumber: string;
	invoiceGeneratedAt: Date;
	/**
	 * SHA-256 du snapshot InvoiceData figé (canonical-JSON, clés triées). `null`
	 * uniquement dans le retour idempotent (EINV-SEQ-006) si le numéro existait
	 * déjà sur une facture legacy sans snapshot (rattrapée par `reconcile-invoices`).
	 */
	invoiceDataHash: string | null;
}

interface PersistInvoiceNumberOptions {
	source?: HistorySource;
	authorId?: string;
	authorName?: string;
}

/**
 * P99 vs race window compromise: 5 attempts cover the practical concurrent-write
 * window for invoice generation while keeping tail latency under control.
 */
const MAX_RETRIES = 5;

/**
 * CHECK constraint DB (`Order_invoiceNumber_format`) impose `^F-[0-9]{4}-[0-9]{5}$`
 * → 99999 factures/an max. Au-delà : on throw avant l'UPDATE plutôt que
 * laisser Postgres rejeter silencieusement avec une P2002 que la boucle de
 * retry tenterait 4 fois de plus en vain.
 *
 * À 99 999 : alerter d'urgence. Élargir la regex en migration (`{5,6}`) prend
 * 10 min mais nécessite un déploiement → mieux vaut le faire avant que ça
 * casse en prod. NB : le SELECT du dernier numéro trie déjà NUMÉRIQUEMENT le
 * suffixe (`split_part(...)::int`), donc l'extension à 6 chiffres ne nécessite
 * QUE la migration de la regex — pas de réécriture de la requête (un tri
 * lexicographique placerait `F-YYYY-100000` avant `F-YYYY-99999` → boucle P2002).
 */
const MAX_SEQUENCE_PER_YEAR = 99_999;

/**
 * EINV-GLOBAL-023 : pré-alerte 90 % du quota annuel. Donne le temps d'étendre
 * la regex CHECK DB (`{5,6}`) avant saturation effective. Aucun side-effect
 * sur l'émission — Sentry warning seulement.
 */
const SEQUENCE_PREALERT_THRESHOLD = Math.floor(MAX_SEQUENCE_PER_YEAR * 0.9);

/**
 * 32-bit advisory lock key for invoice generation, derived from the current
 * year (e.g. 1002026 for 2026). Keeps lock scope bounded to year + handles
 * the empty-table case (1st invoice of year) that FOR UPDATE alone cannot.
 */
function invoiceAdvisoryLockKey(year: number): number {
	return 1_000_000 + year;
}

/**
 * Generates a sequential invoice number (format `F-YYYY-NNNNN`) AND persists it
 * on the order, in a single atomic transaction (Article 286 CGI — séquentiel,
 * immuable, sans trou).
 *
 * Concurrency strategy :
 * - `pg_advisory_xact_lock(year)` Postgres advisory lock acquired first.
 *   This handles the empty-table case at the start of a new year, where a
 *   bare `SELECT ... FOR UPDATE LIMIT 1` would acquire no lock (no row matches).
 * - SELECT highest existing invoice for the year inside the same tx.
 * - UPDATE the order with the new number inside the same tx.
 * - On transient errors (P2002 rare cross-tx collision, P2024/P2028 timeouts
 *   under lock-queue bursts), retry the full tx up to MAX_RETRIES times — safe
 *   because the idempotency guard re-runs under the lock on every attempt.
 *
 * Returns the new invoice fields, or null if generation fails after retries.
 */
export async function persistInvoiceNumber(
	orderId: string,
	userId: string | null,
	options: PersistInvoiceNumberOptions = {},
): Promise<PersistInvoiceNumberResult | null> {
	const { source = HistorySource.SYSTEM, authorId, authorName } = options;

	// Lecture unique HORS section critique (EINV-SEQ-002 + EINV-SEQ-005). Sert à la
	// fois à résoudre le millésime d'encaissement ET à figer le snapshot comptable,
	// de sorte que l'advisory lock par année ne couvre plus aucun round-trip DB
	// (seuls le SELECT du dernier numéro + l'UPDATE restent dans la transaction
	// verrouillée). Les champs du snapshot (items/adresses/totaux) sont figés au
	// checkout et les `vendor*` proviennent de l'env → aucune mutation concurrente
	// possible entre cette lecture et l'UPDATE.
	const order = await prisma.order.findUnique({
		where: { id: orderId },
		select: GET_ORDER_SELECT_ADMIN,
	});
	if (!order) {
		logger.error("persistInvoiceNumber — order not found before sequence resolution", undefined, {
			service: "persist-invoice-number",
			orderId,
		});
		return null;
	}

	// EINV-SEQ-008 — défense en profondeur Art. 289-I CGI (émission à
	// l'encaissement) : JAMAIS de facture pour une commande jamais encaissée.
	// Les 3 callers actuels (ensure-invoice-number, route lazy download,
	// reconcile-invoices Passe 1) gatent déjà `paymentStatus === PAID`, mais un
	// futur caller pourrait l'oublier — la garde vit désormais dans le service.
	// `paidAt != null` couvre les statuts post-encaissement (PARTIALLY_REFUNDED /
	// REFUNDED) où la facture reste légalement due si elle n'a jamais été émise
	// (un remboursement exige facture + avoir, pas d'absence de facture).
	if (order.paidAt == null && order.paymentStatus !== PaymentStatus.PAID) {
		logger.error(
			"persistInvoiceNumber — refusing to invoice a never-paid order (Art. 289-I CGI)",
			undefined,
			{
				service: "persist-invoice-number",
				orderId,
				paymentStatus: order.paymentStatus,
			},
		);
		Sentry.captureMessage("invoice-generation-blocked-never-paid-order", {
			level: "error",
			fingerprint: ["invoice", "never-paid-guard"],
			tags: { service: "persist-invoice-number" },
			extra: { orderId, paymentStatus: order.paymentStatus },
		});
		return null;
	}

	// EINV-SEQ-002 : le millésime de la séquence F-YYYY doit suivre la date
	// d'ENCAISSEMENT (Art. 289-I / 286 CGI), PAS l'horloge de génération. Une
	// génération tardive (fallback lazy download ou cron `reconcile-invoices`
	// franchissant le 31/12) ne doit jamais attribuer un numéro de l'année N+1 à
	// une vente de l'année N. Calcul en `Europe/Paris` : le serveur Vercel tourne
	// en UTC, donc un paiement du 31/12 23:30 UTC (= 01/01 00:30 Paris) doit porter
	// le millésime Paris. Fallback `createdAt` si `paidAt` absent (état incohérent).
	const year = getParisDateParts(order.paidAt ?? order.createdAt).year;

	// Identité vendeur figée à l'émission (Art. L102 B LPF) — déterministe (env),
	// donc calculable hors transaction.
	const vendorSnapshot = buildVendorSnapshot();

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			const result = await prisma.$transaction(
				async (tx) => {
					const prefix = `F-${year}-`;

					// Advisory lock — serializes invoice generation per year, even when
					// no row exists yet (first invoice of the year).
					await tx.$executeRaw(
						Prisma.sql`SELECT pg_advisory_xact_lock(${invoiceAdvisoryLockKey(year)})`,
					);

					// EINV-SEQ-006 — idempotence par commande SOUS le lock. Les callers
					// (webhook eager `ensure-invoice-number`, fallback lazy de la route
					// download, cron `sync-async-payments`) pré-vérifient `invoiceNumber`
					// HORS lock → TOCTOU : deux chemins concurrents passent tous deux leur
					// garde puis se sérialisent ici. Sans cette re-lecture sous lock, le 2e
					// entrant calculerait MAX+1 et ÉCRASERAIT le numéro déjà émis par le 1er
					// (mutation d'une facture émise — Art. 286) en orphelinisant ce 1er
					// numéro (= gap, interdit Art. 286). On retourne donc l'existant en noop.
					const existing = await tx.order.findUnique({
						where: { id: orderId },
						select: {
							invoiceNumber: true,
							invoiceGeneratedAt: true,
							invoiceDataHash: true,
						},
					});
					if (existing?.invoiceNumber) {
						return {
							invoiceNumber: existing.invoiceNumber,
							// Legacy théorique : numéro présent sans `invoiceGeneratedAt`
							// (écriture pré-service). Fallback sur la date d'encaissement
							// (sémantiquement la plus proche de l'émission, Art. 289-I) pour
							// honorer le contrat de retour `invoiceGeneratedAt: Date`.
							invoiceGeneratedAt: existing.invoiceGeneratedAt ?? order.paidAt ?? order.createdAt,
							invoiceDataHash: existing.invoiceDataHash,
							idempotent: true as const,
						};
					}

					const lastRow = await tx.$queryRaw<Array<{ invoiceNumber: string | null }>>(
						// Tri NUMÉRIQUE sur le suffixe (pas lexicographique) : indispensable si
						// la regex CHECK est un jour étendue à 6 chiffres ({5,6}). En
						// lexicographique, `F-YYYY-100000` < `F-YYYY-99999` ⇒ le MAX renverrait
						// 99999 et on re-générerait 100000 en boucle (P2002 → émission bloquée).
						// `split_part(x,'-',3)` isole NNNNN (format garanti par le CHECK DB).
						Prisma.sql`SELECT "invoiceNumber" FROM "Order"
						WHERE "invoiceNumber" LIKE ${prefix + "%"}
						ORDER BY CAST(split_part("invoiceNumber", '-', 3) AS INTEGER) DESC
						LIMIT 1`,
					);

					let nextSequence = 1;
					const lastInvoiceNumber = lastRow[0]?.invoiceNumber;
					if (lastInvoiceNumber) {
						const lastSequence = parseInt(lastInvoiceNumber.slice(prefix.length), 10);
						if (!isNaN(lastSequence)) {
							nextSequence = lastSequence + 1;
						}
					}

					if (nextSequence > MAX_SEQUENCE_PER_YEAR) {
						throw new BusinessError(
							`Séquence facture saturée pour l'année ${year} (limite ${MAX_SEQUENCE_PER_YEAR}). ` +
								`Étendre la regex CHECK DB à 6 chiffres avant nouvelle émission.`,
							"INVOICE_SEQUENCE_OVERFLOW",
						);
					}

					// EINV-GLOBAL-023 — pré-alerte 90% pour planifier la migration de la
					// regex CHECK DB avant saturation. Sentry fingerprinté par année
					// pour éviter le spam (un seul warning par jour côté Sentry).
					if (nextSequence >= SEQUENCE_PREALERT_THRESHOLD) {
						Sentry.withScope((scope) => {
							scope.setLevel("warning");
							scope.setTag("invoiceYear", String(year));
							scope.setFingerprint(["invoice", "sequence-prealert", String(year)]);
							scope.setContext("invoice-sequence", {
								year,
								nextSequence,
								max: MAX_SEQUENCE_PER_YEAR,
								threshold: SEQUENCE_PREALERT_THRESHOLD,
								percentUsed: Math.round((nextSequence / MAX_SEQUENCE_PER_YEAR) * 100),
							});
							Sentry.captureMessage(
								`Invoice sequence at ${nextSequence}/${MAX_SEQUENCE_PER_YEAR} (year ${year}) — extend CHECK regex before saturation`,
								"warning",
							);
						});
					}

					const invoiceNumber = `${prefix}${String(nextSequence).padStart(5, "0")}`;
					const now = new Date();

					// Fige le snapshot `InvoiceData` au moment précis de l'attribution
					// du numéro (Art. L102 B LPF — la "facture" comptable EST le payload
					// de données, pas son rendu PDF). Toute régénération future doit
					// produire un PDF identique à partir de ce snapshot grâce au
					// déterminisme de `renderInvoicePdf`. Construit à partir de l'order
					// pré-lu hors lock (EINV-SEQ-005) : pas de findUnique dans la tx.
					const orderForBuild = {
						...order,
						invoiceNumber,
						invoiceStatus: "GENERATED",
						invoiceGeneratedAt: now,
						// Les vendor* sont écrits dans le même UPDATE — on les patche pour
						// que `buildInvoiceData` voie l'état post-update et que le snapshot
						// reflète l'identité figée du vendeur à T0.
						...vendorSnapshotForOrderShape(vendorSnapshot),
					} as GetOrderReturn;
					const invoiceSnapshot = buildInvoiceData(orderForBuild);

					// Le refine de `invoiceDataSchema` (somme des lignes == totaux) était
					// documenté comme le filet du renderer mais n'était appelé NULLE PART en
					// production (audit schéma 2026-07-30) : une commande aux totaux
					// incohérents produisait une facture figée, immuable et fausse. Il tourne
					// désormais au seul point où le snapshot devient définitif. Échouer ici
					// est le bon comportement : l'exception est captée plus bas, la fonction
					// rend `null`, le caller pose `invoiceRetryDeferred` et le cron
					// `reconcile-invoices` alerte l'admin après 3 tentatives. Mieux vaut une
					// facture différée qu'une facture fausse conservée 10 ans (Art. 289 CGI).
					const validation = invoiceDataSchema.safeParse(invoiceSnapshot);
					if (!validation.success) {
						throw new BusinessError(
							`Snapshot de facture invalide pour la commande ${orderId} : ` +
								validation.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join(" ; "),
							"INVOICE_SNAPSHOT_INVALID",
						);
					}

					// Le hash porte sur l'objet construit, pas sur la sortie de Zod : aucune
					// transformation du validateur ne doit pouvoir déplacer l'empreinte.
					const canonicalJson = canonicalJsonStringify(invoiceSnapshot);
					const invoiceDataHash = createHash("sha256").update(canonicalJson).digest("hex");

					const updated = await tx.order.update({
						where: { id: orderId },
						data: {
							invoiceNumber,
							invoiceStatus: "GENERATED",
							invoiceGeneratedAt: now,
							invoiceDataSnapshot: JSON.parse(canonicalJson) as Prisma.InputJsonValue,
							invoiceDataHash,
							...vendorSnapshot,
						},
						select: { invoiceNumber: true, invoiceGeneratedAt: true },
					});

					// Audit trail (Art. L123-22 Code de Commerce) — la génération de
					// facture est une mutation critique qui doit apparaître dans la
					// timeline OrderHistory au même titre que les transitions de statut.
					await createOrderAuditTx(tx, {
						orderId,
						action: "INVOICE_GENERATED",
						authorId,
						authorName,
						source,
						note: `Facture ${invoiceNumber} générée`,
						metadata: {
							invoiceNumber,
							invoiceGeneratedAt: now.toISOString(),
							invoiceDataHash,
						},
					});

					return { ...updated, invoiceDataHash };
				},
				{
					// L'attente sur pg_advisory_xact_lock compte dans le timeout de la
					// tx interactive (défaut 5s) : sous burst de paiements, les tx
					// sérialisées en queue sur la même clé année expireraient (P2028).
					timeout: TX_TIMEOUT_LONG,
					maxWait: TX_MAX_WAIT_LONG,
				},
			);

			// Pas d'invalidation cache sur le noop idempotent (EINV-SEQ-006) : rien
			// n'a muté, et un download concurrent ne doit pas churner le cache.
			if (!("idempotent" in result)) {
				// Contexte d'appel : webhook `payment_intent.succeeded`, cron
				// `reconcile-invoices`, ou la route de téléchargement de facture — jamais
				// une Server Action (invariant 1 : aucune action n'écrit `invoiceNumber`).
				// `updateTag` y throw et faisait retourner `null` à cette fonction ALORS
				// QUE le numéro était déjà commité : 503 « facture en cours de génération »
				// + flag DLQ + alerte admin parasites (CACHE-AUDIT-011).
				revalidateTagsInBackground(getOrderInvalidationTags(orderId));
			}

			return {
				invoiceNumber: result.invoiceNumber!,
				invoiceGeneratedAt: result.invoiceGeneratedAt!,
				invoiceDataHash: result.invoiceDataHash,
			};
		} catch (e) {
			if (
				e instanceof Prisma.PrismaClientKnownRequestError &&
				RETRYABLE_SEQUENCE_TX_ERROR_CODES.has(e.code) &&
				attempt < MAX_RETRIES - 1
			) {
				continue;
			}
			logger.error("Failed to persist invoice number", e, {
				service: "persist-invoice-number",
				orderId,
				attempt,
			});
			// Saturation séquence annuelle = incident bloquant (Art. 286 CGI). Le
			// `beforeSend` Sentry whitelist déjà ces codes (cf. EINV-OPS-005), on
			// double avec un email admin dédié pour l'action concrète à mener
			// (étendre regex DB à 6 chiffres puis déployer).
			if (e instanceof BusinessError && e.code === "INVOICE_SEQUENCE_OVERFLOW") {
				await sendAdminSequenceOverflowAlert({
					year,
					documentType: "invoice",
				}).catch((alertError) =>
					logger.error("sendAdminSequenceOverflowAlert threw", alertError, {
						service: "persist-invoice-number",
						orderId,
					}),
				);
			}
			return null;
		}
	}

	return null;
}

/**
 * EINV-PDF-005 : backfill du snapshot comptable (`invoiceDataSnapshot` +
 * `invoiceDataHash`) pour les factures émises AVANT l'introduction du snapshot
 * figé (numéro présent, snapshot null).
 *
 * NE GÉNÈRE PAS de numéro de facture (invariant 1 — il existe déjà) ni d'avoir.
 * Idempotent : noop si snapshot déjà présent ou si l'order n'est pas facturé.
 *
 * Pour ces factures historiques, `buildInvoiceData` résout l'identité vendeur
 * via les colonnes `vendor*` figées si présentes, sinon via l'env courant
 * (best-effort — l'env d'émission n'est pas récupérable). Le snapshot fige
 * cette résolution pour neutraliser toute dérive future (Art. L102 B LPF).
 *
 * Appelé par le cron `reconcile-invoices` (Passe 0).
 */
export async function backfillInvoiceDataSnapshot(
	orderId: string,
): Promise<{ invoiceDataHash: string; invoiceDataSnapshot: Prisma.JsonValue } | null> {
	const order = await prisma.order.findUnique({
		where: { id: orderId },
		select: GET_ORDER_SELECT_ADMIN,
	});
	if (!order || !order.invoiceNumber || !order.invoiceGeneratedAt) {
		return null;
	}
	// Idempotent — snapshot déjà figé.
	if (order.invoiceDataSnapshot != null) {
		return null;
	}

	const invoiceData = buildInvoiceData(order as GetOrderReturn);
	const canonicalJson = canonicalJsonStringify(invoiceData);
	const invoiceDataHash = createHash("sha256").update(canonicalJson).digest("hex");
	const snapshot = JSON.parse(canonicalJson) as Prisma.JsonValue;

	await prisma.order.update({
		where: { id: orderId },
		data: {
			invoiceDataSnapshot: snapshot as Prisma.InputJsonValue,
			invoiceDataHash,
		},
	});

	logger.info(`📑 Backfilled invoice data snapshot for legacy order ${orderId}`, {
		service: "persist-invoice-number",
		orderId,
		invoiceNumber: order.invoiceNumber,
	});

	return { invoiceDataHash, invoiceDataSnapshot: snapshot };
}

/**
 * Fige l'identite du vendeur au moment de l'emission de la facture.
 *
 * Art. L102 B LPF : la facture doit etre reconstituable a l'identique 10 ans.
 * Si SIRET, raison sociale, regime TVA ou identifiants PDP changent (demenagement,
 * sortie franchise art. 293 B CGI, evolution forme juridique, changement de PDP),
 * les factures historiques conservent leurs valeurs d'emission.
 *
 * Les valeurs sont lues depuis getVendorLegalInfo() (env + defaults) au moment
 * de l'INSERT du numero — toute regeneration ulterieure via build-invoice-data
 * preferera ce snapshot au lieu de relire l'env actuel.
 */
function buildVendorSnapshot(): Pick<
	Prisma.OrderUpdateInput,
	| "vendorLegalName"
	| "vendorTradeName"
	| "vendorAddress"
	| "vendorSiren"
	| "vendorSiret"
	| "vendorVatNumber"
	| "vendorVatRegime"
	| "vendorLegalForm"
	| "vendorApeCode"
	| "vendorEmail"
	| "vendorBankIban"
	| "vendorBankBic"
> {
	const vendor = getVendorLegalInfo();
	return {
		vendorLegalName: vendor.company_legal_name,
		vendorTradeName: vendor.company_trade_name,
		vendorAddress: vendor.company_address,
		// Normalise pour respecter le format canonique des CHECK DB (chiffres seuls).
		vendorSiren: normalizeFiscalIdentifier(vendor.company_siren),
		vendorSiret: normalizeFiscalIdentifier(vendor.company_siret),
		vendorVatNumber: normalizeFiscalIdentifier(vendor.company_vat),
		vendorVatRegime: parseVatRegime(vendor.company_vat_regime),
		vendorLegalForm: vendor.company_legal_form,
		vendorApeCode: vendor.company_ape,
		vendorEmail: vendor.company_email,
		// IBAN/BIC normalises (espaces strippes, majuscules) pour respecter les CHECK DB
		// '^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$' / '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$'.
		vendorBankIban: normalizeBankIdentifier(vendor.bank_iban),
		vendorBankBic: normalizeBankIdentifier(vendor.bank_bic),
	};
}

function normalizeBankIdentifier(raw: string | null): string | null {
	if (!raw) return null;
	return raw.replace(/\s+/g, "").toUpperCase();
}

/**
 * Convertit une string env en VatRegime typed. Defaut FRANCHISE_BASE si valeur
 * inconnue — evite un crash silencieux sur le CHECK DB si l'env est mal config.
 */
function parseVatRegime(raw: string): VatRegime {
	if (raw === "NORMAL" || raw === "SIMPLIFIE" || raw === "FRANCHISE_BASE") {
		return raw;
	}
	return "FRANCHISE_BASE";
}

/**
 * Cast les valeurs `Prisma.OrderUpdateInput` (wrappers `{set: ...}` possibles)
 * vers la forme plain-value attendue par `GetOrderReturn` pour le buildInvoiceData
 * en mémoire. En pratique `buildVendorSnapshot` retourne déjà des valeurs plates,
 * mais ce cast type-safe explicite documente l'intention et protégera si le
 * helper évolue vers les wrappers Prisma.
 */
function vendorSnapshotForOrderShape(
	snapshot: ReturnType<typeof buildVendorSnapshot>,
): Record<string, string | null> {
	const out: Record<string, string | null> = {};
	for (const [key, value] of Object.entries(snapshot)) {
		if (value === null) {
			out[key] = null;
		} else if (typeof value === "string") {
			out[key] = value;
		} else {
			// Defensive : Prisma wrappers (`{ set: ... }`) ou autres types non-plain.
			// `buildVendorSnapshot` ne devrait jamais produire ces formes, mais on
			// préserve la robustesse pour l'évolution future du helper.
			out[key] = String(value);
		}
	}
	return out;
}
