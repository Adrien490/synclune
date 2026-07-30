import { createHash } from "node:crypto";
import {
	INVOICE_DATA_FORMAT_VERSION,
	readInvoiceDataFormatVersion,
} from "@/modules/invoices/constants/invoice-data-format";
import { canonicalJsonStringify } from "@/modules/invoices/utils/canonical-json";
import type { InvoiceData } from "@/modules/invoices/types/invoice-data";

/**
 * Levée quand le SHA-256 canonical-JSON recalculé d'un `invoiceDataSnapshot`
 * diverge du `invoiceDataHash` figé en DB. Signale une corruption ou un UPDATE
 * non autorisé du snapshot comptable (Art. L102 B LPF — la « facture comme
 * données » doit être restituable à l'identique 10 ans).
 */
export class InvoiceSnapshotIntegrityError extends Error {
	constructor(
		public readonly orderId: string,
		public readonly expectedHash: string,
		public readonly computedHash: string,
	) {
		super(
			`Invoice snapshot integrity check failed for order ${orderId}: ` +
				`expected ${expectedHash}, computed ${computedHash}`,
		);
		this.name = "InvoiceSnapshotIntegrityError";
	}
}

/**
 * Levée quand un snapshot annonce une version de format que ce déploiement ne
 * connaît pas (`formatVersion > INVOICE_DATA_FORMAT_VERSION`) — typiquement une
 * facture écrite par un déploiement plus récent, lue par un plus ancien (rollback,
 * instance en retard). Le hash est alors valide et le document pourtant illisible :
 * des champs peuvent avoir changé de sens. Même posture que
 * `InvoiceSnapshotIntegrityError` — refuser de servir plutôt que servir faux.
 */
export class InvoiceSnapshotVersionError extends Error {
	constructor(
		public readonly orderId: string,
		public readonly snapshotVersion: number,
		public readonly supportedVersion: number,
	) {
		super(
			`Invoice snapshot format version ${snapshotVersion} for order ${orderId} is newer ` +
				`than the supported version ${supportedVersion}`,
		);
		this.name = "InvoiceSnapshotVersionError";
	}
}

export interface VerifiedInvoiceSnapshot {
	invoiceData: InvoiceData;
	/** SHA-256 recalculé du snapshot canonical-JSON. */
	computedHash: string;
	/** Version de format lue dans le snapshot (absente ⇒ 1, forme legacy). */
	formatVersion: number;
}

/**
 * Recalcule le SHA-256 canonical-JSON du `invoiceDataSnapshot` et le compare au
 * `invoiceDataHash` figé à l'émission (EINV-GLOBAL-005). Garantit que la
 * « facture comme données » lue depuis la DB n'a pas dérivé avant tout usage
 * aval (transmission PDP, régénération XML/PDF).
 *
 * - `snapshot` null/absent → throw (état incohérent — l'appelant doit garantir
 *   la présence du snapshot avant d'appeler).
 * - `expectedHash` présent + mismatch → throw `InvoiceSnapshotIntegrityError`.
 * - `expectedHash` null → best-effort rétro-compat (factures historiques
 *   pré-snapshot) : on ne peut pas vérifier, on renvoie le snapshot tel quel.
 *   Le CHECK DB `Order_invoiceDataSnapshot_hash_coherence_check` garantit
 *   qu'un snapshot non-null implique un hash non-null pour toute facture émise
 *   après le fix — donc ce cas ne concerne que les données legacy.
 * - `formatVersion` du snapshot > version supportée → throw
 *   `InvoiceSnapshotVersionError`. Un `formatVersion` absent vaut 1 (forme
 *   antérieure à son introduction) et passe.
 *
 * Le calcul réplique `persist-invoice-number.service.ts` : `canonicalJsonStringify`
 * (tri lexicographique récursif des clés) puis SHA-256 hex.
 */
export function verifyInvoiceSnapshot(
	orderId: string,
	snapshot: unknown,
	expectedHash: string | null,
): VerifiedInvoiceSnapshot {
	if (snapshot === null || snapshot === undefined) {
		throw new Error(
			`verifyInvoiceSnapshot: invoiceDataSnapshot absent pour la commande ${orderId}`,
		);
	}

	const computedHash = createHash("sha256").update(canonicalJsonStringify(snapshot)).digest("hex");

	if (expectedHash && computedHash !== expectedHash) {
		throw new InvoiceSnapshotIntegrityError(orderId, expectedHash, computedHash);
	}

	// Contrôle de version APRÈS le hash : un snapshot corrompu doit être signalé
	// comme corrompu, pas comme « version inconnue ».
	const formatVersion = readInvoiceDataFormatVersion(snapshot);
	if (formatVersion > INVOICE_DATA_FORMAT_VERSION) {
		throw new InvoiceSnapshotVersionError(orderId, formatVersion, INVOICE_DATA_FORMAT_VERSION);
	}

	return { invoiceData: snapshot as InvoiceData, computedHash, formatVersion };
}
