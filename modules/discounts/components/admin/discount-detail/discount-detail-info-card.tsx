import { Info } from "lucide-react";

import { CopyButton } from "@/shared/components/copy-button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatEuro } from "@/shared/utils/format-euro";

import {
	DISCOUNT_STATUS_BADGE_CONFIG,
	DISCOUNT_TYPE_LABELS,
	formatDiscountValue,
} from "../../../constants/discount.constants";
import { getDiscountStatus } from "../../../services/discount-validation.service";
import type { GetDiscountReturn } from "../../../types/discount.types";

interface DiscountDetailInfoCardProps {
	discount: NonNullable<GetDiscountReturn>;
}

export function DiscountDetailInfoCard({ discount }: DiscountDetailInfoCardProps) {
	const status = DISCOUNT_STATUS_BADGE_CONFIG[getDiscountStatus(discount)];

	return (
		<Card style={{ viewTransitionName: "discount-detail-info" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Info className="size-5" aria-hidden="true" />
					Informations
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<dl className="grid gap-3 text-sm">
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Statut</dt>
						<dd>
							<Badge variant={status.variant}>{status.label}</Badge>
						</dd>
					</div>
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Type</dt>
						<dd className="font-medium">{DISCOUNT_TYPE_LABELS[discount.type]}</dd>
					</div>
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Valeur</dt>
						<dd className="font-medium">{formatDiscountValue(discount.type, discount.value)}</dd>
					</div>
					{discount.minOrderAmount !== null ? (
						<div className="flex items-center justify-between gap-3">
							<dt className="text-muted-foreground">Montant min. de commande</dt>
							<dd className="font-medium">{formatEuro(discount.minOrderAmount)}</dd>
						</div>
					) : null}
					{discount.maxUsagePerUser !== null ? (
						<div className="flex items-center justify-between gap-3">
							<dt className="text-muted-foreground">Max par utilisateur</dt>
							<dd className="font-medium">{discount.maxUsagePerUser}</dd>
						</div>
					) : null}
					<div className="flex items-start justify-between gap-3">
						<dt className="text-muted-foreground shrink-0 pt-1.5">Code</dt>
						<dd className="flex min-w-0 items-start gap-1">
							<span className="text-foreground/80 pt-1.5 font-mono text-xs break-all">
								{discount.code}
							</span>
							<CopyButton
								text={discount.code}
								label="Code"
								className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
							/>
						</dd>
					</div>
				</dl>
			</CardContent>
		</Card>
	);
}
