"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function DiscountDetailError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="🎟️"
			title="Le code promo n'a pas pu charger"
			route="admin.marketing.discounts.detail"
			fallbackHref="/admin/marketing/discounts"
			fallbackLabel="Retour aux codes promo"
		/>
	);
}
