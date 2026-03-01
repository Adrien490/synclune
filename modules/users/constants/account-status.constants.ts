import { AccountStatus } from "@/app/generated/prisma/enums";
import type { BadgeVariant } from "@/shared/types/badge.types";

/**
 * Labels d'affichage pour les statuts de compte
 * Note: Les clés sont lowercase car @map() dans Prisma génère des valeurs lowercase
 */
export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
	[AccountStatus.ACTIVE]: "Actif",
	[AccountStatus.INACTIVE]: "Inactif",
	[AccountStatus.PENDING_DELETION]: "Suppression en attente",
	[AccountStatus.ANONYMIZED]: "Anonymisé",
} as const;

/**
 * Variantes de badge pour l'affichage des statuts
 */
export const ACCOUNT_STATUS_VARIANTS: Record<AccountStatus, BadgeVariant> = {
	[AccountStatus.ACTIVE]: "success",
	[AccountStatus.INACTIVE]: "warning",
	[AccountStatus.PENDING_DELETION]: "destructive",
	[AccountStatus.ANONYMIZED]: "secondary",
} as const;

/**
 * Description des statuts pour tooltips/aide
 */
export const ACCOUNT_STATUS_DESCRIPTIONS: Record<AccountStatus, string> = {
	[AccountStatus.ACTIVE]: "Compte actif et fonctionnel",
	[AccountStatus.INACTIVE]: "Compte temporairement désactivé par l'administrateur",
	[AccountStatus.PENDING_DELETION]:
		"Demande de suppression RGPD en attente (période de grâce 30 jours)",
	[AccountStatus.ANONYMIZED]: "Données personnelles anonymisées, historique des commandes conservé",
} as const;
