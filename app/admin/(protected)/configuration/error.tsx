"use client";

import { AdminListErrorBoundary } from "@/app/admin/(protected)/_components/admin-list-error-boundary";

export default function ConfigurationHubError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="⚙️"
			title="La configuration n'a pas pu charger"
			route="admin.configuration"
			fallbackHref="/admin"
			fallbackLabel="Retour au tableau de bord"
		/>
	);
}
