import { type Metadata } from "next";

import { assertAdminPage } from "@/modules/auth/lib/assert-admin-page";
import { RevokeSessionsCard } from "@/modules/auth/components/admin/revoke-sessions-card";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = {
	title: "Sécurité - Administration",
	description: "Gérer les sessions ouvertes du compte administrateur",
};

export default async function SecuritySettingsPage() {
	await assertAdminPage();

	return (
		<>
			<PageHeader
				variant="compact"
				title="Sécurité"
				description="Gérez les sessions ouvertes de votre compte"
			/>

			<div className="mx-auto max-w-2xl">
				<RevokeSessionsCard />
			</div>
		</>
	);
}
