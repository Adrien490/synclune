import { Activity } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";

import type { GetDiscountReturn } from "../../../types/discount.types";

interface DiscountDetailUsageCardProps {
	discount: NonNullable<GetDiscountReturn>;
}

export function DiscountDetailUsageCard({ discount }: DiscountDetailUsageCardProps) {
	const hasMax = discount.maxUsageCount !== null;
	const percent = hasMax ? Math.min(100, (discount.usageCount / discount.maxUsageCount!) * 100) : 0;
	const remaining = hasMax ? Math.max(0, discount.maxUsageCount! - discount.usageCount) : null;

	return (
		<Card style={{ viewTransitionName: "discount-detail-usage" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Activity className="size-5" aria-hidden="true" />
					Utilisation
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<div className="flex items-baseline justify-between gap-3">
						<span className="text-muted-foreground text-sm">Utilisations</span>
						<span className="text-lg font-semibold">
							{discount.usageCount}
							<span className="text-muted-foreground text-sm font-normal">
								{" "}
								/ {hasMax ? discount.maxUsageCount : "∞"}
							</span>
						</span>
					</div>
					{hasMax ? (
						<Progress
							value={percent}
							aria-label={`${discount.usageCount} utilisations sur ${discount.maxUsageCount}`}
						/>
					) : null}
				</div>
				{remaining !== null ? (
					<p className="text-muted-foreground border-t pt-4 text-sm">
						{remaining === 0
							? "Limite atteinte — le code n'est plus utilisable."
							: `${remaining} ${remaining > 1 ? "utilisations restantes" : "utilisation restante"}.`}
					</p>
				) : (
					<p className="text-muted-foreground border-t pt-4 text-sm italic">
						Utilisation illimitée.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
