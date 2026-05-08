"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function ColorDetailError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="🎨"
			title="La couleur n'a pas pu charger"
			route="admin.catalogue.couleurs.detail"
			fallbackHref="/admin/catalogue/couleurs"
			fallbackLabel="Retour aux couleurs"
		/>
	);
}
