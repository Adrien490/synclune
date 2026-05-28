import { createHash } from "node:crypto";

/**
 * Décide si une facture donnée doit être effectivement transmise à la PDP/PA
 * lors de l'orchestration de transmission B2B/B2G.
 *
 * Combine trois leviers, dans cet ordre (un seul "non" bloque la transmission) :
 *  1. Kill-switch global `INVOICE_ENABLE_PROVIDER_TRANSMISSION` (any truthy → ON)
 *  2. Canary par pourcentage déterministe : `hash(orderId) % 100 < canaryPercent`
 *  3. Critère secondaire : `order.total >= INVOICE_TRANSMISSION_MIN_AMOUNT` (centimes)
 *
 * Propriétés garanties :
 *  - Déterministe : même `orderId` → même décision (rejouable).
 *  - Distribution uniforme : SHA-256 → tiré uniforme sur [0,100).
 *  - Rollback partiel : passer le canary de 50 à 10 invalide instantanément les
 *    factures non-éligibles sans toucher à celles déjà transmises.
 *  - Kill-switch wins : si `enable_provider_transmission` est OFF, aucun canary
 *    ne peut overrider.
 *
 * Référence : audit Phase 5 EINV-PROVIDER-009.
 */
export interface ShouldTransmitInvoiceInput {
	orderId: string;
	orderTotal: number; // centimes
}

function parseBool(value: string | undefined): boolean {
	if (!value) return false;
	const normalized = value.toLowerCase();
	return normalized === "true" || normalized === "1" || normalized === "yes";
}

function parseCanaryPercent(value: string | undefined): number {
	if (!value) return 0;
	const n = Number.parseInt(value, 10);
	if (Number.isNaN(n)) return 0;
	if (n < 0) return 0;
	if (n > 100) return 100;
	return n;
}

function parseMinAmount(value: string | undefined): number {
	if (!value) return 0;
	const n = Number.parseInt(value, 10);
	if (Number.isNaN(n) || n < 0) return 0;
	return n;
}

/**
 * Hash déterministe vers [0, 100). Utilise SHA-256 (uniformément distribué)
 * sur l'ID — on lit les 4 premiers octets et on prend modulo 100. Cette
 * réduction modulo-bias est négligeable car 2^32 % 100 = 96 (biais < 1‰).
 */
function hashOrderIdToBucket(orderId: string): number {
	const hash = createHash("sha256").update(orderId).digest();
	const head = hash.readUInt32BE(0);
	return head % 100;
}

export function shouldTransmitInvoice(input: ShouldTransmitInvoiceInput): boolean {
	const globalEnabled = parseBool(process.env.INVOICE_ENABLE_PROVIDER_TRANSMISSION);
	if (!globalEnabled) return false;

	const canaryPercent = parseCanaryPercent(process.env.INVOICE_TRANSMISSION_CANARY_PERCENT);
	if (canaryPercent === 0) return false;
	if (canaryPercent < 100) {
		const bucket = hashOrderIdToBucket(input.orderId);
		if (bucket >= canaryPercent) return false;
	}

	const minAmount = parseMinAmount(process.env.INVOICE_TRANSMISSION_MIN_AMOUNT);
	if (minAmount > 0 && input.orderTotal < minAmount) return false;

	return true;
}
