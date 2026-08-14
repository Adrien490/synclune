"use client";

import { AdminListErrorBoundary } from "@/app/admin/(protected)/_components/admin-list-error-boundary";

export default function VariantsAdminError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="🧩"
			title="Les variantes n'ont pas pu charger"
			route="admin.catalogue.produits.variantes"
			fallbackHref="/admin/catalogue/produits"
			fallbackLabel="Retour aux produits"
		/>
	);
}
