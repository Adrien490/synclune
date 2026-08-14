"use client";

import { AdminListErrorBoundary } from "@/app/admin/(protected)/_components/admin-list-error-boundary";

export default function MaterialsAdminError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="🪨"
			title="Les matériaux n'ont pas pu charger"
			route="admin.catalogue.materiaux"
			fallbackHref="/admin/catalogue"
			fallbackLabel="Retour au catalogue"
		/>
	);
}
