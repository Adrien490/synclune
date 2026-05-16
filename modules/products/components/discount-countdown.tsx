"use client";

import { Clock } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { useCountdown } from "@/shared/hooks/use-countdown";

interface DiscountCountdownProps {
	/** Target moment where the discount expires. */
	endDate: Date | string | null | undefined;
	/** Hide the badge when more than this many days remain (default 7). */
	maxDaysToShow?: number;
}

function formatRemaining({
	days,
	hours,
	minutes,
}: {
	days: number;
	hours: number;
	minutes: number;
}): string {
	if (days > 0) {
		return days > 1 ? `${days} jours` : `1 jour ${hours}h`;
	}
	if (hours > 0) {
		return `${hours}h ${minutes}min`;
	}
	return `${minutes} min`;
}

/**
 * DiscountCountdown - Badge affichant le temps restant avant la fin d'une promo.
 *
 * Conditions d'affichage :
 *  - `endDate` est fournie et valide
 *  - Le temps restant est > 0 (sinon badge caché)
 *  - Le temps restant est ≤ `maxDaysToShow` jours (sinon urgence artificielle)
 *
 * A11y : `role="timer"`, `aria-live="off"` pour ne pas interrompre les lecteurs d'écran
 * à chaque tick. Le texte est rafraîchi chaque minute seulement.
 */
export function DiscountCountdown({ endDate, maxDaysToShow = 7 }: DiscountCountdownProps) {
	const snapshot = useCountdown(endDate);

	if (!snapshot || snapshot.isExpired) return null;
	if (snapshot.days >= maxDaysToShow) return null;

	const label = formatRemaining(snapshot);

	return (
		<Badge
			variant="outline"
			className="gap-1.5 border-dashed border-amber-600 bg-amber-100 text-xs/5 tracking-normal text-amber-800 antialiased"
			role="timer"
			aria-live="off"
			aria-label={`Fin de l'offre dans ${label}`}
		>
			<Clock className="size-3.5" aria-hidden="true" />
			Fin de l'offre dans <span className="font-semibold">{label}</span>
		</Badge>
	);
}
