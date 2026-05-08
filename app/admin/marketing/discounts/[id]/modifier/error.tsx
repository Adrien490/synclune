"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function DiscountEditError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="🎁"
			title="Ce code promo n'a pas pu charger"
			route="admin.marketing.discounts.modifier"
		/>
	);
}
