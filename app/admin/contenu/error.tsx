"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function ContenuHubError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="📝"
			title="Le contenu n'a pas pu charger"
			route="admin.contenu"
			fallbackHref="/admin"
			fallbackLabel="Retour au tableau de bord"
		/>
	);
}
