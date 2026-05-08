import { AdminDetailBackLink } from "@/shared/components/admin-detail-back-link";
import { Separator } from "@/shared/components/ui/separator";

import type { GetDiscountReturn } from "../../types/discount.types";

import { DiscountUpdateForm } from "./discount-update-form";

interface DiscountEditPageProps {
	discount: NonNullable<GetDiscountReturn>;
}

export function DiscountEditPage({ discount }: DiscountEditPageProps) {
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
			<AdminDetailBackLink href="/admin/marketing/discounts" label="Retour aux codes promo" />
			<header className="space-y-2">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">
						Modifier le code{" "}
						<code className="bg-muted rounded px-1.5 py-0.5 text-xl">{discount.code}</code>
					</h1>
					<p className="text-muted-foreground text-sm">
						Modifiez les paramètres du code promo existant.
					</p>
				</div>
			</header>

			<Separator />

			<DiscountUpdateForm
				discount={{
					id: discount.id,
					code: discount.code,
					type: discount.type,
					value: discount.value,
					minOrderAmount: discount.minOrderAmount,
					maxUsageCount: discount.maxUsageCount,
					maxUsagePerUser: discount.maxUsagePerUser,
					isActive: discount.isActive,
					startsAt: discount.startsAt,
					endsAt: discount.endsAt,
				}}
			/>
		</div>
	);
}
