/**
 * EINV-EREPORT-010 — Couche TRANSMISSION e-reporting (P2-2 / P2-3 de l'audit
 * `binary-starfish`). Verrouille la dérivation, AU MOMENT D'ÉMETTRE vers la PA :
 *  - ventilation par taux transmise MÊME en franchise (ligne unique taux 0) ;
 *  - agrégats JOURNALIERS dans un dépôt potentiellement bimestriel.
 *
 * Ces helpers ne touchent PAS aux données stockées (snapshot figé 10 ans,
 * Art. L102 B LPF — la régression `ereporting-vat-breakdown` garde le stockage à
 * `null` en franchise). Fonctions PURES — aucun mock.
 */
import { describe, expect, it } from "vitest";
import {
	computeDailyAggregates,
	toTransmittedVatBreakdown,
	type VatBreakdownLine,
} from "../build-ereporting-transaction";

describe("toTransmittedVatBreakdown — ventilation transmise (franchise incluse)", () => {
	it("franchise (stockée null) → ligne unique taux 0 portant tout le HT, TVA 0", () => {
		expect(toTransmittedVatBreakdown(null, 5000, 0)).toEqual([
			{ rate: 0, baseExclTax: 5000, taxAmount: 0 },
		]);
	});

	it("franchise (stockée vide) → ligne unique taux 0", () => {
		expect(toTransmittedVatBreakdown([], 1234, 0)).toEqual([
			{ rate: 0, baseExclTax: 1234, taxAmount: 0 },
		]);
	});

	it("régime réel (ventilation stockée non vide) → transmise telle quelle", () => {
		const stored: VatBreakdownLine[] = [
			{ rate: 550, baseExclTax: 2000, taxAmount: 110 },
			{ rate: 2000, baseExclTax: 5000, taxAmount: 1000 },
		];
		expect(toTransmittedVatBreakdown(stored, 7000, 1110)).toBe(stored);
	});

	it("n'invente jamais de taux > 0 en franchise (taxAmount 0 ⇒ rate 0 uniquement)", () => {
		const out = toTransmittedVatBreakdown(null, 9999, 0);
		expect(out.every((l) => l.rate === 0)).toBe(true);
		expect(out.reduce((s, l) => s + l.taxAmount, 0)).toBe(0);
	});

	it("HT négatif (batch dominé par des remboursements) → préservé sur la ligne taux 0", () => {
		expect(toTransmittedVatBreakdown(null, -2000, 0)).toEqual([
			{ rate: 0, baseExclTax: -2000, taxAmount: 0 },
		]);
	});
});

describe("computeDailyAggregates — détail journalier d'un batch", () => {
	const tx = (iso: string, inc: number, excl: number, tax = 0) => ({
		occurredAt: new Date(iso),
		amountIncTax: inc,
		amountExclTax: excl,
		taxAmount: tax,
	});

	it("cadence DAILY (un seul jour) → un agrégat", () => {
		const out = computeDailyAggregates([
			tx("2026-03-15T09:00:00Z", 1000, 1000),
			tx("2026-03-15T18:30:00Z", 2000, 2000),
		]);
		expect(out).toEqual([
			{
				day: "2026-03-15",
				transactionCount: 2,
				totalAmountIncTax: 3000,
				totalAmountExclTax: 3000,
				totalTaxAmount: 0,
			},
		]);
	});

	it("période multi-jours (bimestre) → un agrégat par jour, trié croissant", () => {
		const out = computeDailyAggregates([
			tx("2026-03-16T10:00:00Z", 500, 500),
			tx("2026-03-15T10:00:00Z", 1000, 1000),
			tx("2026-03-15T23:59:00Z", 700, 700),
		]);
		expect(out.map((d) => d.day)).toEqual(["2026-03-15", "2026-03-16"]);
		expect(out[0]).toEqual({
			day: "2026-03-15",
			transactionCount: 2,
			totalAmountIncTax: 1700,
			totalAmountExclTax: 1700,
			totalTaxAmount: 0,
		});
		expect(out[1]?.transactionCount).toBe(1);
	});

	it("groupe par jour UTC (pas heure locale) — 23:59Z et 00:01Z+1 sont 2 jours", () => {
		const out = computeDailyAggregates([
			tx("2026-03-15T23:59:00Z", 100, 100),
			tx("2026-03-16T00:01:00Z", 200, 200),
		]);
		expect(out.map((d) => d.day)).toEqual(["2026-03-15", "2026-03-16"]);
	});

	it("supporte les montants signés (REFUND négatifs)", () => {
		const out = computeDailyAggregates([
			tx("2026-03-15T10:00:00Z", 1000, 1000),
			tx("2026-03-15T11:00:00Z", -400, -400),
		]);
		expect(out[0]).toEqual({
			day: "2026-03-15",
			transactionCount: 2,
			totalAmountIncTax: 600,
			totalAmountExclTax: 600,
			totalTaxAmount: 0,
		});
	});

	it("liste vide → []", () => {
		expect(computeDailyAggregates([])).toEqual([]);
	});

	it("invariant : Σ(agrégats journaliers) = total batch", () => {
		const txs = [
			tx("2026-03-15T10:00:00Z", 1000, 1000),
			tx("2026-03-16T10:00:00Z", 2500, 2500),
			tx("2026-03-16T12:00:00Z", 500, 500),
		];
		const out = computeDailyAggregates(txs);
		const sumInc = out.reduce((s, d) => s + d.totalAmountIncTax, 0);
		const sumCount = out.reduce((s, d) => s + d.transactionCount, 0);
		expect(sumInc).toBe(4000);
		expect(sumCount).toBe(3);
	});
});
