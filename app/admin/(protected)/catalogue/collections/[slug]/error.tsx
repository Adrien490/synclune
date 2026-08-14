"use client";

import { AdminListErrorBoundary } from "@/app/admin/(protected)/_components/admin-list-error-boundary";

export default function CollectionDetailError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="📚"
			title="La collection n'a pas pu charger"
			route="admin.catalogue.collections.detail"
			fallbackHref="/admin/catalogue/collections"
			fallbackLabel="Retour aux collections"
		/>
	);
}
