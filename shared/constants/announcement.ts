/**
 * SSOT de la tonalité du bandeau d'annonce (storefront + aperçu admin).
 *
 * Les valeurs miroitent l'enum Prisma `AnnouncementVariant` (DB = source de
 * vérité du stockage) ; ce module est la source de vérité *applicative* pour le
 * mapping tonalité → classes Tailwind et libellés FR. Les accents (close button,
 * pastille countdown) restent agnostiques via `currentColor` — seul le conteneur
 * porte la couleur de fond + foreground.
 */

export const ANNOUNCEMENT_VARIANTS = ["PROMO", "INFO", "WARNING"] as const;

export type AnnouncementVariant = (typeof ANNOUNCEMENT_VARIANTS)[number];

export const DEFAULT_ANNOUNCEMENT_VARIANT: AnnouncementVariant = "PROMO";

/** Conteneur : fond + couleur de texte (foreground) par tonalité. */
export const ANNOUNCEMENT_VARIANT_CLASSES: Record<AnnouncementVariant, string> = {
	PROMO: "bg-primary text-primary-foreground",
	INFO: "bg-info text-info-foreground",
	WARNING: "bg-warning text-warning-foreground",
};

/** Libellés FR pour le select admin. */
export const ANNOUNCEMENT_VARIANT_LABELS: Record<AnnouncementVariant, string> = {
	PROMO: "Promotion",
	INFO: "Information",
	WARNING: "Alerte",
};

export function isAnnouncementVariant(value: unknown): value is AnnouncementVariant {
	return typeof value === "string" && (ANNOUNCEMENT_VARIANTS as readonly string[]).includes(value);
}
