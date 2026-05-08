"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function CollectionsAdminError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="📚"
			title="Les collections n'ont pas pu charger"
			route="admin.catalogue.collections"
			fallbackHref="/admin/catalogue"
			fallbackLabel="Retour au catalogue"
		/>
	);
}
