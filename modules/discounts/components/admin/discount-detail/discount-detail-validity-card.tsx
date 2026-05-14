import { format, formatDistanceToNow, isAfter, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

import type { GetDiscountReturn } from "../../../types/discount.types";

interface DiscountDetailValidityCardProps {
	discount: NonNullable<GetDiscountReturn>;
}

function getValidityHint(startsAt: Date, endsAt: Date | null): string | null {
	const now = new Date();
	if (isBefore(now, startsAt)) {
		return `Démarre ${formatDistanceToNow(startsAt, { addSuffix: true, locale: fr })}`;
	}
	if (endsAt && isAfter(now, endsAt)) {
		return `A expiré ${formatDistanceToNow(endsAt, { addSuffix: true, locale: fr })}`;
	}
	if (endsAt) {
		return `Se termine ${formatDistanceToNow(endsAt, { addSuffix: true, locale: fr })}`;
	}
	return "Validité sans date de fin";
}

export function DiscountDetailValidityCard({ discount }: DiscountDetailValidityCardProps) {
	const hint = getValidityHint(discount.startsAt, discount.endsAt);

	return (
		<Card style={{ viewTransitionName: "discount-detail-validity" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Calendar className="size-5" aria-hidden="true" />
					Période de validité
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<dl className="grid gap-3 text-sm">
					<div className="flex items-start justify-between gap-3">
						<dt className="text-muted-foreground">Démarre le</dt>
						<dd className="text-right font-medium">
							{format(discount.startsAt, "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
						</dd>
					</div>
					<div className="flex items-start justify-between gap-3">
						<dt className="text-muted-foreground">Se termine le</dt>
						<dd className="text-right font-medium">
							{discount.endsAt ? (
								format(discount.endsAt, "d MMMM yyyy 'à' HH'h'mm", { locale: fr })
							) : (
								<span className="text-muted-foreground italic">Sans date de fin</span>
							)}
						</dd>
					</div>
				</dl>
				{hint ? <p className="text-muted-foreground border-t pt-4 text-sm italic">{hint}</p> : null}
			</CardContent>
		</Card>
	);
}
