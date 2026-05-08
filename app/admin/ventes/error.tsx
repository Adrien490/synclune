"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function VentesHubError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="🧾"
			title="Les ventes n'ont pas pu charger"
			route="admin.ventes"
			fallbackHref="/admin"
			fallbackLabel="Retour au tableau de bord"
		/>
	);
}
