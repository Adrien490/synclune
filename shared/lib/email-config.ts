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
 * Nom de l'entreprise pour les emails
 */
export const EMAIL_COMPANY_NAME = "Synclune";

/**
 * Messages d'email prédéfinis
 */
export const EMAIL_SUBJECTS = {
	VERIFICATION: "Vérifiez votre adresse email - Synclune",
	PASSWORD_RESET: "Réinitialisez votre mot de passe - Synclune",
	PASSWORD_CHANGED: "Votre mot de passe a été modifié - Synclune",
	ORDER_CONFIRMATION: "Confirmation de commande - Synclune",
	ORDER_SHIPPED: "Votre commande a été expédiée - Synclune",
	ORDER_TRACKING_UPDATE: "Mise à jour du suivi de votre commande - Synclune",
	ORDER_DELIVERED: "Votre commande a été livrée - Synclune",
	ORDER_CANCELLED: "Votre commande a été annulée - Synclune",
	ORDER_RETURNED: "Retour enregistré pour votre commande - Synclune",
	ORDER_SHIPPING_REVERTED: "Mise à jour de l'expédition de votre commande - Synclune",
	REFUND_CONFIRMATION: "Votre remboursement a été effectué - Synclune",
	REFUND_APPROVED: "Votre demande de remboursement a été acceptée - Synclune",
	REFUND_REJECTED: "Votre demande de remboursement a été refusée - Synclune",
	PAYMENT_FAILED: "Échec de votre paiement - Synclune",
	NEWSLETTER_CONFIRMATION: "Confirmez votre inscription à la newsletter Synclune ✨",
	NEWSLETTER_WELCOME: "Bienvenue dans notre communauté Synclune ! 🎉",
	CUSTOMIZATION_REQUEST: "✨ Nouvelle demande de personnalisation - Synclune",
	CUSTOMIZATION_CONFIRMATION: "Votre demande de personnalisation a été reçue - Synclune",
	CUSTOMIZATION_IN_PROGRESS: "Votre personnalisation est en cours - Synclune",
	CUSTOMIZATION_COMPLETED: "Votre personnalisation est terminée ! - Synclune",
	CUSTOMIZATION_CANCELLED: "Votre demande de personnalisation a été annulée - Synclune",
	ACCOUNT_DELETED: "Votre compte a été supprimé - Synclune",
	REVIEW_REQUEST: "Votre avis compte ! - Synclune",
	REVIEW_REMINDER: "Rappel : votre avis compte ! - Synclune",
	REVIEW_RESPONSE: "Nous avons répondu à votre avis - Synclune",
	WELCOME: "Bienvenue chez Synclune ! ✨",
	ABANDONED_CART: "Vous avez oublié quelque chose... - Synclune",
	BACK_IN_STOCK: "Bonne nouvelle ! Un article de votre liste est de retour - Synclune",
	CROSS_SELL: "Complétez votre collection - Synclune",
} as const;
