"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function MarketingHubError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="🎯"
			title="Le marketing n'a pas pu charger"
			route="admin.marketing"
			fallbackHref="/admin"
			fallbackLabel="Retour au tableau de bord"
		/>
	);
}
