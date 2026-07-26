"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function ReviewDetailError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="⭐"
			title="Cet avis n'a pas pu charger"
			route="admin.marketing.avis.detail"
			fallbackHref="/admin/marketing/avis"
			fallbackLabel="Retour aux avis"
		/>
	);
}
