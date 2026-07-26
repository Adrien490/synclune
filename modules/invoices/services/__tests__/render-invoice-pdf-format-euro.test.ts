import { describe, it, expect } from "vitest";
import { formatEuro } from "../render-invoice-pdf";

/**
 * Formateur monétaire LOCAL du PDF facture — arithmétique entière sans Intl
 * (déterminisme byte-stable requis pour le hash SHA-256, Art. L102 B LPF).
 * Les espaces (milliers + devise) sont des U+00A0 LITTÉRAUX figés dans le
 * source — jamais U+202F, dont l'apparition via Intl entre versions Node est
 * précisément ce que ce formateur évite. Verrouille arrondis et format exact.
 */
const NBSP = "\u00A0";

describe("formatEuro (PDF facture, sans Intl)", () => {
	it("formate un montant standard en centimes", () => {
		expect(formatEuro(1999)).toBe(`19,99${NBSP}€`);
	});

	it("pad les centimes à 2 chiffres", () => {
		expect(formatEuro(5)).toBe(`0,05${NBSP}€`);
		expect(formatEuro(1050)).toBe(`10,50${NBSP}€`);
		expect(formatEuro(1000)).toBe(`10,00${NBSP}€`);
	});

	it("formate zéro", () => {
		expect(formatEuro(0)).toBe(`0,00${NBSP}€`);
	});

	it("groupe les milliers avec U+00A0 littéral (jamais U+202F)", () => {
		expect(formatEuro(123456789)).toBe(`1${NBSP}234${NBSP}567,89${NBSP}€`);
		expect(formatEuro(100000)).toBe(`1${NBSP}000,00${NBSP}€`);
		// Byte-stabilité : l'espace fine insécable Intl (U+202F) ne doit jamais apparaître
		expect(formatEuro(123456789)).not.toMatch(/\u202F/);
	});

	it("préfixe les montants négatifs (avoirs) avec le signe -", () => {
		expect(formatEuro(-1999)).toBe(`-19,99${NBSP}€`);
		expect(formatEuro(-5)).toBe(`-0,05${NBSP}€`);
	});

	it("arrondit défensivement les centimes non entiers", () => {
		// Les montants DB sont des Int — garde défensive seulement.
		// Math.round arrondit ,5 vers +∞ (asymétrique sur les négatifs).
		expect(formatEuro(1999.4)).toBe(`19,99${NBSP}€`);
		expect(formatEuro(1999.5)).toBe(`20,00${NBSP}€`);
		expect(formatEuro(-1999.5)).toBe(`-19,99${NBSP}€`);
	});
});
