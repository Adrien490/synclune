import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { CloseStoreForm } from "@/modules/store-settings/components/admin/close-store-form";
import { getStoreSettings } from "@/modules/store-settings/data/get-store-settings";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { PageHeader } from "@/shared/components/page-header";
import { assertAdminPage } from "@/modules/auth/lib/assert-admin-page";

export const metadata: Metadata = {
	title: "Fermer la boutique - Administration",
	description: "Fermer temporairement la boutique avec un message client",
};

export default async function CloseStorePage() {
	await assertAdminPage();

	const settings = await getStoreSettings();

	if (settings?.isClosed) {
		redirect("/admin/configuration/boutique");
	}

	return (
		<div className="space-y-6">
			<Breadcrumb className="hidden md:block">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/configuration/boutique">
							Paramètres boutique
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Fermer la boutique</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<PageHeader
				variant="compact"
				title="Fermer la boutique"
				description="Cette action interrompt immédiatement les commandes."
			/>

			<div className="mx-auto max-w-2xl">
				<CloseStoreForm />
			</div>
		</div>
	);
}
