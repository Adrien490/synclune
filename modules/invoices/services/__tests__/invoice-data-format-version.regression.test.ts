import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import {
	INVOICE_DATA_FORMAT_VERSION,
	LEGACY_INVOICE_DATA_FORMAT_VERSION,
	readInvoiceDataFormatVersion,
} from "@/modules/invoices/constants/invoice-data-format";
import { invoiceDataSchema } from "@/modules/invoices/schemas/invoice.schema";
import { canonicalJsonStringify } from "@/modules/invoices/utils/canonical-json";
import { verifyInvoiceSnapshot, InvoiceSnapshotVersionError } from "../verify-invoice-snapshot";

/**
 * @regression invoice-data-format-version
 *
 * Verrouille le versionnage de la FORME du snapshot comptable
 * (`Order.invoiceDataSnapshot`, Art. L102 B LPF — conservation 10 ans).
 *
 * Défaut d'origine (audit schéma 2026-07-30) : le payload n'avait aucun marqueur de
 * version, et `verifyInvoiceSnapshot` rendait le JSONB relu par un `as InvoiceData`
 * — un cast, pas une validation. Le jour où un champ change, rien ne permettait de
 * savoir quelle forme portait une ligne : le cast rend `undefined` en silence, et le
 * hash reste valide (il porte sur le JSON stocké, pas sur la forme attendue). Deux
 * changements de format sont datés : mention CGI → CIBS au 31/12/2027, réécriture de
 * l'e-reporting au go-live.
 *
 * Les trois propriétés verrouillées ici :
 *   1. un snapshot legacy (sans `formatVersion`) est lu en version 1 et vérifie
 *      toujours son hash — la rétro-compatibilité ne dépend pas d'un backfill ;
 *   2. un snapshot annonçant une version INCONNUE est refusé, pas réinterprété ;
 *   3. `formatVersion` est dans le payload, donc sous le SHA-256 : le falsifier
 *      casse l'empreinte.
 */

function hashOf(snapshot: unknown): string {
	return createHash("sha256").update(canonicalJsonStringify(snapshot)).digest("hex");
}

const BASE_SNAPSHOT = {
	invoiceNumber: "F-2026-00042",
	currency: "EUR",
	totals: { totalInclTax: 4990, totalTax: 0 },
	seller: { siren: "839183027" },
};

describe("versionnage du format InvoiceData", () => {
	it("la SSOT est un entier ≥ 1 (invariant « entiers seuls », EINV-PDF-008)", () => {
		// Un flottant casserait le round-trip JSONB byte-stable dont dépend l'égalité
		// de hash — donc l'immuabilité vérifiable de la facture.
		expect(Number.isInteger(INVOICE_DATA_FORMAT_VERSION)).toBe(true);
		expect(INVOICE_DATA_FORMAT_VERSION).toBeGreaterThanOrEqual(1);
		expect(LEGACY_INVOICE_DATA_FORMAT_VERSION).toBe(1);
	});

	it("un snapshot legacy sans formatVersion est lu en version 1", () => {
		expect(readInvoiceDataFormatVersion(BASE_SNAPSHOT)).toBe(1);
		const result = verifyInvoiceSnapshot("order-1", BASE_SNAPSHOT, hashOf(BASE_SNAPSHOT));
		expect(result.formatVersion).toBe(1);
		expect(result.invoiceData).toEqual(BASE_SNAPSHOT);
	});

	it("une valeur non entière ou absurde retombe sur la forme legacy", () => {
		expect(readInvoiceDataFormatVersion({ formatVersion: 1.5 })).toBe(1);
		expect(readInvoiceDataFormatVersion({ formatVersion: 0 })).toBe(1);
		expect(readInvoiceDataFormatVersion({ formatVersion: "2" })).toBe(1);
		expect(readInvoiceDataFormatVersion(null)).toBe(1);
	});

	it("un snapshot à la version courante passe et rend sa version", () => {
		const snapshot = { ...BASE_SNAPSHOT, formatVersion: INVOICE_DATA_FORMAT_VERSION };
		const result = verifyInvoiceSnapshot("order-1", snapshot, hashOf(snapshot));
		expect(result.formatVersion).toBe(INVOICE_DATA_FORMAT_VERSION);
	});

	it("un snapshot d'une version PLUS RÉCENTE est refusé, pas réinterprété", () => {
		// Cas réel : rollback de déploiement, ou instance en retard qui lit une
		// facture écrite par la nouvelle. Le hash est bon, la forme est inconnue.
		const future = { ...BASE_SNAPSHOT, formatVersion: INVOICE_DATA_FORMAT_VERSION + 1 };
		expect(() => verifyInvoiceSnapshot("order-1", future, hashOf(future))).toThrow(
			InvoiceSnapshotVersionError,
		);
	});

	it("l'intégrité passe AVANT la version : un snapshot altéré est signalé comme corrompu", () => {
		// Sinon un snapshot corrompu dont le bruit touche `formatVersion` serait
		// diagnostiqué « version inconnue » — mauvaise piste pour l'investigation.
		const tampered = { ...BASE_SNAPSHOT, formatVersion: INVOICE_DATA_FORMAT_VERSION + 1 };
		expect(() => verifyInvoiceSnapshot("order-1", tampered, hashOf(BASE_SNAPSHOT))).toThrow(
			/integrity check failed/,
		);
	});

	it("formatVersion est couvert par le hash (falsification détectable)", () => {
		const emitted = { ...BASE_SNAPSHOT, formatVersion: INVOICE_DATA_FORMAT_VERSION };
		const frozenHash = hashOf(emitted);
		const relabelled = { ...emitted, formatVersion: INVOICE_DATA_FORMAT_VERSION + 1 };
		expect(hashOf(relabelled)).not.toBe(frozenHash);
	});

	it("le schéma Zod traite formatVersion comme un entier à défaut, pas comme requis", () => {
		// `.default()` et non `.optional()` : valider un snapshot historique ne doit
		// pas échouer et doit rendre une version exploitable. La validation du payload
		// complet vit dans build-invoice-data.test.ts, qui porte la fixture d'Order ;
		// ici on n'atteste que la forme du champ, sans dupliquer 60 lignes de fixture.
		const field = invoiceDataSchema.def.shape.formatVersion;
		expect(field.safeParse(undefined).success).toBe(true);
		expect(field.parse(undefined)).toBe(LEGACY_INVOICE_DATA_FORMAT_VERSION);
		expect(field.safeParse(1.5).success).toBe(false);
		expect(field.safeParse(0).success).toBe(false);
		expect(field.safeParse(3).success).toBe(true);
	});
});
