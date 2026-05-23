/**
 * SSOT — wording shipping unavailable, partagé par ShippingMethodSection,
 * PayButton, CheckoutSummary. Évite la divergence repérée pré-audit
 * (3 phrasings différents pour la même condition).
 */
export const SHIPPING_UNAVAILABLE = {
	section: "Nous ne livrons pas encore dans cette zone.",
	contactCta: "Écris-nous pour trouver une solution.",
	payButton: "Cette zone n'est pas livrable pour le moment.",
	summary: "Zone non livrable",
} as const;
