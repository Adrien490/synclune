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

/**
 * Couleurs pour l'affichage des badges de statut
 */
export const NEWSLETTER_STATUS_COLORS: Record<
  NewsletterStatus,
  "yellow" | "green" | "gray"
> = {
  [NewsletterStatus.PENDING]: "yellow",
  [NewsletterStatus.CONFIRMED]: "green",
  [NewsletterStatus.UNSUBSCRIBED]: "gray",
} as const;

/**
 * Description des statuts pour tooltips/aide
 */
export const NEWSLETTER_STATUS_DESCRIPTIONS: Record<NewsletterStatus, string> =
  {
    [NewsletterStatus.PENDING]:
      "En attente de confirmation par email (double opt-in non validé)",
    [NewsletterStatus.CONFIRMED]: "Abonnement actif, email de confirmation validé",
    [NewsletterStatus.UNSUBSCRIBED]: "L'utilisateur s'est désabonné de la newsletter",
  } as const;
