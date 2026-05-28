import { createHash } from "node:crypto";
import { Prisma, HistorySource } from "@/app/generated/prisma/client";
import type { VatRegime } from "@/app/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { BusinessError } from "@/shared/lib/actions/business-error";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getVendorLegalInfo } from "@/shared/lib/stripe";
import { normalizeFiscalIdentifier } from "@/shared/schemas/b2b-identifiers.schema";
import { buildInvoiceData } from "@/modules/invoices/services/build-invoice-data";
import { canonicalJsonStringify } from "@/modules/invoices/utils/canonical-json";
import { updateTag } from "next/cache";
import { sendAdminSequenceOverflowAlert } from "@/modules/emails/services/admin-emails";
import { GET_ORDER_SELECT_ADMIN } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { createOrderAuditTx } from "../utils/order-audit";
import type { GetOrderReturn } from "../types/order.types";

interface PersistInvoiceNumberResult {
	invoiceNumber: string;
	invoiceGeneratedAt: Date;
	/** SHA-256 du snapshot InvoiceData figé (canonical-JSON, clés triées). */
	invoiceDataHash: string;
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
 * casse en prod.
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
 * - On P2002 unique violation (rare cross-tx collision), retry the full tx
 *   up to MAX_RETRIES times.
 *
 * Returns the new invoice fields, or null if generation fails after retries.
 */
export async function persistInvoiceNumber(
	orderId: string,
	userId: string | null,
	options: PersistInvoiceNumberOptions = {},
): Promise<PersistInvoiceNumberResult | null> {
	const { source = HistorySource.SYSTEM, authorId, authorName } = options;

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			const result = await prisma.$transaction(async (tx) => {
				const year = new Date().getFullYear();
				const prefix = `F-${year}-`;

				// Advisory lock — serializes invoice generation per year, even when
				// no row exists yet (first invoice of the year).
				await tx.$executeRaw(
					Prisma.sql`SELECT pg_advisory_xact_lock(${invoiceAdvisoryLockKey(year)})`,
				);

				const lastRow = await tx.$queryRaw<Array<{ invoiceNumber: string | null }>>(
					Prisma.sql`SELECT "invoiceNumber" FROM "Order"
						WHERE "invoiceNumber" LIKE ${prefix + "%"}
						ORDER BY "invoiceNumber" DESC
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
				const vendorSnapshot = buildVendorSnapshot();

				// Fige le snapshot `InvoiceData` au moment précis de l'attribution
				// du numéro (Art. L102 B LPF — la "facture" comptable EST le payload
				// de données, pas son rendu PDF). Toute régénération future doit
				// produire un PDF identique à partir de ce snapshot grâce au
				// déterminisme de `renderInvoicePdf`.
				const orderForSnapshot = await tx.order.findUnique({
					where: { id: orderId },
					select: GET_ORDER_SELECT_ADMIN,
				});
				if (!orderForSnapshot) {
					throw new BusinessError(
						`Order ${orderId} not found while building invoice snapshot`,
						"ORDER_NOT_FOUND",
					);
				}
				const orderForBuild = {
					...orderForSnapshot,
					invoiceNumber,
					invoiceStatus: "GENERATED",
					invoiceGeneratedAt: now,
					// Les vendor* sont écrits dans le même UPDATE — on les patche pour
					// que `buildInvoiceData` voie l'état post-update et que le snapshot
					// reflète l'identité figée du vendeur à T0.
					...vendorSnapshotForOrderShape(vendorSnapshot),
				} as GetOrderReturn;
				const invoiceSnapshot = buildInvoiceData(orderForBuild);
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
			});

			getOrderInvalidationTags(userId ?? undefined, orderId).forEach((tag) => updateTag(tag));

			return {
				invoiceNumber: result.invoiceNumber!,
				invoiceGeneratedAt: result.invoiceGeneratedAt!,
				invoiceDataHash: result.invoiceDataHash,
			};
		} catch (e) {
			if (
				e instanceof Prisma.PrismaClientKnownRequestError &&
				e.code === "P2002" &&
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
					year: new Date().getFullYear(),
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
	| "vendorEInvoicingPlatformId"
	| "vendorEInvoicingAddress"
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
		vendorEInvoicingPlatformId: vendor.einvoicing_platform_id,
		vendorEInvoicingAddress: vendor.einvoicing_address,
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
