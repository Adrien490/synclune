import type { AdminListPendingKind } from "@/shared/contexts/admin-list-pending-context";

/**
 * Libellés FR affichés en badge "Verb…" pendant une bulk-action.
 * Source unique de vérité — chaque mobile-item lit ce map au lieu de redéfinir.
 */
export const ADMIN_PENDING_LABELS: Record<AdminListPendingKind, string> = {
	archive: "Archivage…",
	restore: "Restauration…",
	delete: "Suppression…",
	status: "Mise à jour…",
	"attach-collection": "Ajout à la collection…",
	publish: "Publication…",
	hide: "Masquage…",
	feature: "Mise en avant…",
	unfeature: "Retrait de la vitrine…",
	activate: "Activation…",
	deactivate: "Désactivation…",
	promote: "Promotion admin…",
	demote: "Rétrogradation…",
	approve: "Validation…",
	reject: "Refus…",
	cancel: "Annulation…",
};
