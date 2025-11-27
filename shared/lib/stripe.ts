import Stripe from "stripe";

/**
 * Instance Stripe centralisée pour toute l'application
 * Utilise automatiquement la version API compatible avec le SDK Stripe (v19.2.0)
 * Pas de version explicite = le SDK gère la compatibilité
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Configuration des mentions légales françaises pour les factures
 * Conformité auto-entrepreneur (Article L441-9 Code de commerce)
 */
export const FRENCH_INVOICE_LEGAL_METADATA = {
  // Identification entreprise
  company_legal_name: "TADDEI LEANE - Entrepreneur Individuel",
  company_trade_name: "Synclune",
  company_siret: "839 183 027 00037",
  company_siren: "839 183 027",
  company_vat: "FR35839183027",
  company_ape: "47.91B",
  company_address: "77 Boulevard du Tertre, 44100 Nantes, France",

  // Assurance RC Professionnelle (En cours de souscription)
  // ℹ️ Non obligatoire pour bijoux fantaisie, mais recommandée
  // Obligatoire uniquement pour bijouterie-joaillerie (métaux précieux)
  insurance_company: "En cours de souscription",
  insurance_contact: "contact@synclune.fr",
  insurance_coverage: "France",

  // Mentions légales obligatoires
  vat_exemption: "TVA non applicable, art. 293 B du CGI",
  late_payment_penalty_rate: "12,40%",
  recovery_fee: "40 €",
  operation_nature: "Livraison de biens",

  // Répertoire
  registry: "Inscrite au Répertoire National des Entreprises (RNE)",
} as const;

/**
 * Footer personnalisé pour les factures Stripe
 * Contient toutes les mentions légales obligatoires
 */
export function getInvoiceFooter(): string {
  const insuranceText = FRENCH_INVOICE_LEGAL_METADATA.insurance_company === "En cours de souscription"
    ? `Assurance RC Pro : ${FRENCH_INVOICE_LEGAL_METADATA.insurance_company} - Pour toute question : ${FRENCH_INVOICE_LEGAL_METADATA.insurance_contact}`
    : `Assurance RC Pro : ${FRENCH_INVOICE_LEGAL_METADATA.insurance_company}
Contact assureur : ${FRENCH_INVOICE_LEGAL_METADATA.insurance_contact}`;

  return `
${FRENCH_INVOICE_LEGAL_METADATA.company_legal_name}
SIRET : ${FRENCH_INVOICE_LEGAL_METADATA.company_siret} • SIREN : ${FRENCH_INVOICE_LEGAL_METADATA.company_siren}
${FRENCH_INVOICE_LEGAL_METADATA.company_address}
${FRENCH_INVOICE_LEGAL_METADATA.vat_exemption}

${insuranceText}
Couverture géographique : ${FRENCH_INVOICE_LEGAL_METADATA.insurance_coverage}

Nature de l'opération : ${FRENCH_INVOICE_LEGAL_METADATA.operation_nature}
Pénalités de retard : ${FRENCH_INVOICE_LEGAL_METADATA.late_payment_penalty_rate} (taux minimum légal)
Indemnité forfaitaire de recouvrement : ${FRENCH_INVOICE_LEGAL_METADATA.recovery_fee}

${FRENCH_INVOICE_LEGAL_METADATA.registry}
`.trim();
}
