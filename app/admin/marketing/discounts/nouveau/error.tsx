"use client";

import { AdminFormErrorBoundary } from "@/app/admin/_components/admin-form-error-boundary";

export default function NewDiscountError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire de création de promotion n'a pas pu charger"
			route="admin.marketing.discounts.nouveau"
			backHref="/admin/marketing/discounts"
			backLabel="Retour aux promotions"
		/>
	);
}
