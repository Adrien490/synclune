"use client";

import { AdminListErrorBoundary } from "@/app/admin/(protected)/_components/admin-list-error-boundary";

export default function BoutiqueSettingsError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="🏪"
			title="Les réglages boutique n'ont pas pu charger"
			route="admin.configuration.boutique"
			fallbackHref="/admin/configuration"
			fallbackLabel="Retour à la configuration"
		/>
	);
}
