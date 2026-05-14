import type { GetDiscountReturn } from "../../../types/discount.types";

import { DiscountDetailHeader } from "./discount-detail-header";
import { DiscountDetailInfoCard } from "./discount-detail-info-card";
import { DiscountDetailUsageCard } from "./discount-detail-usage-card";
import { DiscountDetailValidityCard } from "./discount-detail-validity-card";

interface DiscountDetailPageProps {
	discount: NonNullable<GetDiscountReturn>;
}

export function DiscountDetailPage({ discount }: DiscountDetailPageProps) {
	return (
		<div className="space-y-6">
			<DiscountDetailHeader discount={discount} />

			<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
				<div className="space-y-6 lg:col-span-2">
					<DiscountDetailInfoCard discount={discount} />
					<DiscountDetailValidityCard discount={discount} />
				</div>

				<div className="space-y-6">
					<DiscountDetailUsageCard discount={discount} />
				</div>
			</div>
		</div>
	);
}
