import { NewsletterStatus } from "@/app/generated/prisma/enums";

/**
 * Labels d'affichage pour les statuts newsletter
 * Note: Les clés utilisent l'enum car @map() dans Prisma génère des valeurs lowercase
 */
export const NEWSLETTER_STATUS_LABELS: Record<NewsletterStatus, string> = {
	[NewsletterStatus.PENDING]: "En attente",
	[NewsletterStatus.CONFIRMED]: "Confirmé",
	[NewsletterStatus.UNSUBSCRIBED]: "Désabonné",
} as const;
