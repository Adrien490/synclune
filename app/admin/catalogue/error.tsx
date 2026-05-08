"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function CatalogueHubError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="💎"
			title="Le catalogue n'a pas pu charger"
			route="admin.catalogue"
			fallbackHref="/admin"
			fallbackLabel="Retour au tableau de bord"
		/>
	);
}
