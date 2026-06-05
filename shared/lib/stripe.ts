import "server-only";
import Stripe from "stripe";
import { stripeCircuitBreaker, CircuitBreakerError } from "./circuit-breaker";
import { logger } from "./logger";
import { DEFAULT_FRANCHISE_VAT_MENTION } from "@/shared/constants/vat-franchise";

/**
 * Instance Stripe centralisée pour toute l'application
 * - apiVersion épinglée explicitement ("2026-05-27.dahlia") pour neutraliser les breaking changes silencieux
 * - maxNetworkRetries: 2 pour retry automatique en cas d'erreur réseau
 * - timeout: 10s
 *
 * Note: Cette instance suppose que STRIPE_SECRET_KEY est défini.
 * Pour les contextes où la clé pourrait manquer (cron jobs), utiliser getStripeClient().
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: "2026-05-27.dahlia",
	maxNetworkRetries: 2,
	timeout: 10_000,
});

export { CircuitBreakerError };

/**
 * Execute a Stripe API call through the circuit breaker.
 * Fails fast when Stripe is known to be down, preventing cascade failures.
 *
 * @example
 * ```ts
 * const session = await withStripeCircuitBreaker(() =>
 *   stripe.checkout.sessions.create({ ... })
 * );
 * ```
 */
export async function withStripeCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
	return stripeCircuitBreaker.execute(fn);
}

/**
 * Récupère une instance Stripe de manière sécurisée
 * Retourne null si STRIPE_SECRET_KEY n'est pas défini
 *
 * Usage recommandé pour les cron jobs et contextes où la clé pourrait manquer:
 * ```ts
 * const stripe = getStripeClient();
 * if (!stripe) {
 *   return cronError("STRIPE_SECRET_KEY not configured");
 * }
 * ```
 */
let _stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe | null {
	if (_stripeClient) return _stripeClient;

	const secretKey = process.env.STRIPE_SECRET_KEY;
	if (!secretKey) {
		logger.error("STRIPE_SECRET_KEY environment variable is not set", undefined, {
			service: "stripe",
		});
		return null;
	}
	_stripeClient = new Stripe(secretKey, {
		apiVersion: "2026-05-27.dahlia",
		maxNetworkRetries: 2,
		timeout: 10_000,
	});
	return _stripeClient;
}

/**
 * Récupère les informations légales du vendeur depuis les variables d'environnement
 * avec fallback vers les valeurs par défaut.
 *
 * Variables d'environnement disponibles :
 * - VENDOR_LEGAL_NAME
 * - VENDOR_TRADE_NAME
 * - VENDOR_SIRET
 * - VENDOR_SIREN
 * - VENDOR_VAT_NUMBER
 * - VENDOR_APE_CODE
 * - VENDOR_FULL_ADDRESS
 * - VENDOR_EMAIL
 * - VENDOR_VAT_EXEMPTION_TEXT
 * - VENDOR_LATE_PAYMENT_PENALTY_RATE
 * - VENDOR_RECOVERY_FEE
 * - VENDOR_INSURANCE_COMPANY
 * - VENDOR_INSURANCE_CONTACT
 * - VENDOR_INSURANCE_COVERAGE
 * - VENDOR_REGISTRY
 * - VENDOR_OPERATION_NATURE
 * - VENDOR_BANK_IBAN     (optionnel — affiché sur factures B2B viré, BT-84 EN16931)
 * - VENDOR_BANK_BIC      (optionnel — BT-86 EN16931)
 * - VENDOR_VAT_REGIME    (FRANCHISE_BASE | NORMAL | SIMPLIFIE — figé sur Order via snapshot vendeur)
 * - VENDOR_LEGAL_FORM    (forme juridique — figé sur Order)
 * - VENDOR_EINVOICING_PLATFORM_ID  (identifiant emetteur annuaire central PDP — reforme 2026-2027)
 * - VENDOR_EINVOICING_ADDRESS      (adresse electronique de facturation emetteur)
 */
export function getVendorLegalInfo() {
	return {
		company_legal_name: process.env.VENDOR_LEGAL_NAME ?? "TADDEI LEANE - Entrepreneur Individuel",
		company_trade_name: process.env.VENDOR_TRADE_NAME ?? "Synclune",
		company_siret: process.env.VENDOR_SIRET ?? "839 183 027 00037",
		company_siren: process.env.VENDOR_SIREN ?? "839 183 027",
		company_vat: process.env.VENDOR_VAT_NUMBER ?? "FR35839183027",
		company_vat_regime: process.env.VENDOR_VAT_REGIME ?? "FRANCHISE_BASE",
		company_legal_form: process.env.VENDOR_LEGAL_FORM ?? "Entrepreneur individuel",
		company_ape: process.env.VENDOR_APE_CODE ?? "47.91B",
		company_address:
			process.env.VENDOR_FULL_ADDRESS ?? "77 Boulevard du Tertre, 44100 Nantes, France",
		company_email: process.env.VENDOR_EMAIL ?? "contact@synclune.fr",
		einvoicing_platform_id: process.env.VENDOR_EINVOICING_PLATFORM_ID ?? null,
		einvoicing_address: process.env.VENDOR_EINVOICING_ADDRESS ?? null,
		insurance_company: process.env.VENDOR_INSURANCE_COMPANY ?? "En cours de souscription",
		insurance_contact: process.env.VENDOR_INSURANCE_CONTACT ?? "contact@synclune.fr",
		insurance_coverage: process.env.VENDOR_INSURANCE_COVERAGE ?? "France",
		vat_exemption: process.env.VENDOR_VAT_EXEMPTION_TEXT ?? DEFAULT_FRANCHISE_VAT_MENTION,
		late_payment_penalty_rate: process.env.VENDOR_LATE_PAYMENT_PENALTY_RATE ?? "12,40%",
		recovery_fee: process.env.VENDOR_RECOVERY_FEE ?? "40 €",
		operation_nature: process.env.VENDOR_OPERATION_NATURE ?? "Livraison de biens",
		registry:
			process.env.VENDOR_REGISTRY ?? "Inscrite au Répertoire National des Entreprises (RNE)",
		bank_iban: process.env.VENDOR_BANK_IBAN ?? null,
		bank_bic: process.env.VENDOR_BANK_BIC ?? null,
	} as const;
}

/**
 * Footer personnalisé pour les factures Stripe
 * Contient toutes les mentions légales obligatoires
 */
export function getInvoiceFooter(): string {
	const info = getVendorLegalInfo();

	const insuranceText =
		info.insurance_company === "En cours de souscription"
			? `Assurance RC Pro : ${info.insurance_company} - Pour toute question : ${info.insurance_contact}`
			: `Assurance RC Pro : ${info.insurance_company}
Contact assureur : ${info.insurance_contact}`;

	return `
${info.company_legal_name}
SIRET : ${info.company_siret} • SIREN : ${info.company_siren}
${info.company_address}
${info.vat_exemption}

${insuranceText}
Couverture géographique : ${info.insurance_coverage}

Nature de l'opération : ${info.operation_nature}
Pénalités de retard : ${info.late_payment_penalty_rate} (taux minimum légal)
Indemnité forfaitaire de recouvrement : ${info.recovery_fee}

${info.registry}
`.trim();
}
