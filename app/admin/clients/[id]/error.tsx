"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function UserDetailError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="👤"
			title="Ce client n'a pas pu charger"
			route="admin.clients.detail"
			fallbackHref="/admin/clients"
			fallbackLabel="Retour aux clients"
		/>
	);
}
