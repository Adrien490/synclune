"use client";

import { AdminListErrorBoundary } from "@/app/admin/(protected)/_components/admin-list-error-boundary";

export default function MaterialDetailError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="💎"
			title="Le matériau n'a pas pu charger"
			route="admin.catalogue.materiaux.detail"
			fallbackHref="/admin/catalogue/materiaux"
			fallbackLabel="Retour aux matériaux"
		/>
	);
}
