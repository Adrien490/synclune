"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function ColorsAdminError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="🎨"
			title="Les couleurs n'ont pas pu charger"
			route="admin.catalogue.couleurs"
			fallbackHref="/admin/catalogue"
			fallbackLabel="Retour au catalogue"
		/>
	);
}
