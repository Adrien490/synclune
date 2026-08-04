/**
 * Configuration centralisée des emails
 *
 * Ce fichier contient toutes les configurations liées aux emails Resend.
 * Pour changer l'adresse d'expédition, modifiez directement les constantes ci-dessous.
 */

/**
 * Adresse email de contact/support/admin
 * Utilisée pour l'expédition des emails et la réception des notifications admin
 */
const CONTACT_EMAIL = process.env.RESEND_CONTACT_EMAIL!;

/**
 * Adresse email d'expédition par défaut
 * Format: "Nom Affiché <email@domain.com>"
 */
export const EMAIL_FROM = `Synclune <${CONTACT_EMAIL}>`;

/**
 * Adresse email de contact/support
 * Utilisée pour les liens "Contactez-nous" dans les emails
 */
export const EMAIL_CONTACT = CONTACT_EMAIL;

/**
 * Adresse email admin pour les notifications
 * Utilise la même adresse que le contact
 */
export const EMAIL_ADMIN = CONTACT_EMAIL;

/**
 * Adresse BCC optionnelle ajoutée automatiquement aux emails admin (alertes
 * critiques : refund failed, invoice sequence overflow, dispute, etc.).
 *
 * Permet d'avoir un fallback humain si la boîte EMAIL_ADMIN est saturée ou
 * inaccessible. Activée uniquement si EMAIL_ADMIN_BCC est défini en env —
 * sinon `undefined` et aucun BCC n'est ajouté (comportement historique).
 */
export const EMAIL_ADMIN_BCC = process.env.EMAIL_ADMIN_BCC ?? undefined;

/**
 * Messages d'email prédéfinis
 */
// Un sujet par émetteur réel (8 templates, cf. CLAUDE.md § Emails). Les sujets
// orphelins (REFUND_APPROVED/REJECTED/CANCELLED du workflow refund parti au Lot 2,
// PASSWORD_CHANGED / EMAIL_CHANGE_CONFIRMATION de l'espace client, ORDER_RETURNED /
// ORDER_SHIPPING_REVERTED des emails retirés) ont été purgés au Lot 6.
export const EMAIL_SUBJECTS = {
	VERIFICATION: "Vérifiez votre adresse email - Synclune",
	PASSWORD_RESET: "Réinitialisez votre mot de passe - Synclune",
	ORDER_CONFIRMATION: "Confirmation de commande - Synclune",
	ORDER_SHIPPED: "Votre commande a été expédiée - Synclune",
	ORDER_CANCELLED: "Votre commande a été annulée - Synclune",
	REFUND_CONFIRMATION: "Votre remboursement a été effectué - Synclune",
	PAYMENT_FAILED: "Échec de votre paiement - Synclune",
} as const;
