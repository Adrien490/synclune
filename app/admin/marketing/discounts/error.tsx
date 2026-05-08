"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function DiscountsAdminError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="🎟️"
			title="Les codes promo n'ont pas pu charger"
			route="admin.marketing.discounts"
			fallbackHref="/admin/marketing"
			fallbackLabel="Retour au marketing"
		/>
	);
}
