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
// Un sujet par émetteur RÉEL — schéma lean, lot 4 : il ne reste que deux
// templates (confirmation + expédition). Les sujets orphelins (auth Better
// Auth, annulation, remboursement, échec de paiement) sont purgés ; le lot 5
// recréera les siens (accusé de rétractation, remboursement, rejet) avec
// leurs templates.
export const EMAIL_SUBJECTS = {
	ORDER_CONFIRMATION: "Confirmation de commande - Synclune",
	ORDER_SHIPPED: "Votre commande a été expédiée - Synclune",
	RETRACTATION_ACK: "Demande de rétractation bien reçue - Synclune",
	RETRACTATION_REFUNDED: "Votre remboursement est en route - Synclune",
	RETRACTATION_REJECTED: "Votre demande de rétractation - Synclune",
} as const;
