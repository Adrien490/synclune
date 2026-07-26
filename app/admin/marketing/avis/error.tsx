"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function ReviewsAdminError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="⭐"
			title="Les avis n'ont pas pu charger"
			route="admin.marketing.avis"
			fallbackHref="/admin/marketing"
			fallbackLabel="Retour au marketing"
		/>
	);
}
