import { Badge } from "@/shared/components/ui/badge";

/**
 * Alerte visuelle du délai légal de remboursement : 14 jours après la
 * DEMANDE (art. L221-24). Pas de cron (perte volontaire § 1) — c'est cette
 * pastille, dans la liste et le détail, qui tient l'échéance sous les yeux
 * de Léane.
 *
 * Composant PUR : `daysLeft` est calculé dans la couche data
 * (`getRefundDeadlineDaysLeft`), jamais pendant le rendu. `null` = demande
 * close, rien à afficher.
 */
export function RefundDeadlineBadge({ daysLeft }: { daysLeft: number | null }) {
	if (daysLeft === null) return null;

	if (daysLeft <= 0) {
		return <Badge variant="destructive">Délai de remboursement dépassé</Badge>;
	}
	if (daysLeft <= 3) {
		return <Badge variant="destructive">Rembourser sous {daysLeft} j</Badge>;
	}
	return <Badge variant="outline">{daysLeft} j pour rembourser</Badge>;
}
