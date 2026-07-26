"use client";

import { AdminFormErrorBoundary } from "@/app/admin/_components/admin-form-error-boundary";

export default function DiscountEditError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire d'édition du code promo n'a pas pu charger"
			route="admin.marketing.discounts.modifier"
			backHref="/admin/marketing/discounts"
			backLabel="Retour aux codes promo"
		/>
	);
}
