import Stripe from "stripe";

/**
 * Instance Stripe centralisée pour toute l'application
 * Utilise automatiquement la version API compatible avec le SDK Stripe (v20.x)
 * - maxNetworkRetries: 2 pour retry automatique en cas d'erreur réseau
 *
 * Note: Cette instance suppose que STRIPE_SECRET_KEY est défini.
 * Pour les contextes où la clé pourrait manquer (cron jobs), utiliser getStripeClient().
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: "2026-01-28.clover",
	maxNetworkRetries: 2,
});

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
export function getStripeClient(): Stripe | null {
	const secretKey = process.env.STRIPE_SECRET_KEY;
	if (!secretKey) {
		console.error("[Stripe] STRIPE_SECRET_KEY environment variable is not set");
		return null;
	}
	return new Stripe(secretKey, {
		apiVersion: "2026-01-28.clover",
		maxNetworkRetries: 2,
	});
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
 */
export function getVendorLegalInfo() {
  return {
    company_legal_name:
      process.env.VENDOR_LEGAL_NAME || "TADDEI LEANE - Entrepreneur Individuel",
    company_trade_name: process.env.VENDOR_TRADE_NAME || "Synclune",
    company_siret: process.env.VENDOR_SIRET || "839 183 027 00037",
    company_siren: process.env.VENDOR_SIREN || "839 183 027",
    company_vat: process.env.VENDOR_VAT_NUMBER || "FR35839183027",
    company_ape: process.env.VENDOR_APE_CODE || "47.91B",
    company_address:
      process.env.VENDOR_FULL_ADDRESS ||
      "77 Boulevard du Tertre, 44100 Nantes, France",
    company_email: process.env.VENDOR_EMAIL || "contact@synclune.fr",
    insurance_company:
      process.env.VENDOR_INSURANCE_COMPANY || "En cours de souscription",
    insurance_contact:
      process.env.VENDOR_INSURANCE_CONTACT || "contact@synclune.fr",
    insurance_coverage: process.env.VENDOR_INSURANCE_COVERAGE || "France",
    vat_exemption:
      process.env.VENDOR_VAT_EXEMPTION_TEXT ||
      "TVA non applicable, art. 293 B du CGI",
    late_payment_penalty_rate:
      process.env.VENDOR_LATE_PAYMENT_PENALTY_RATE || "12,40%",
    recovery_fee: process.env.VENDOR_RECOVERY_FEE || "40 €",
    operation_nature: process.env.VENDOR_OPERATION_NATURE || "Livraison de biens",
    registry:
      process.env.VENDOR_REGISTRY ||
      "Inscrite au Répertoire National des Entreprises (RNE)",
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
