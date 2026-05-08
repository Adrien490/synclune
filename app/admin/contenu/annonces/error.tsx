"use client";

import { AdminListErrorBoundary } from "@/app/admin/_components/admin-list-error-boundary";

export default function AnnouncementsAdminError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<AdminListErrorBoundary
			{...props}
			emoji="📣"
			title="Les annonces n'ont pas pu charger"
			route="admin.contenu.annonces"
		/>
	);
}
