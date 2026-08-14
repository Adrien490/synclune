import { GearIcon } from "@phosphor-icons/react/ssr";
import { type Metadata } from "next";
import { Suspense } from "react";

import { getStoreSettings } from "@/modules/store-settings/data/get-store-settings";
import { StoreSettingsForm } from "@/modules/store-settings/components/admin/store-settings-form";
import { StoreSettingsFormSkeleton } from "@/modules/store-settings/components/admin/store-settings-form-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

export const metadata: Metadata = {
	title: "Paramètres boutique - Administration",
	description: "Gérer l'ouverture et la fermeture de la boutique",
};

export default async function StoreSettingsPage() {
	await assertAdminPage();

	return (
		<>
			<PageHeader
				variant="compact"
				title="Paramètres boutique"
				description="Gérez l'ouverture, la fermeture et la programmation de la boutique"
			/>

			<div className="mx-auto max-w-2xl">
				<Suspense fallback={<StoreSettingsFormSkeleton />}>
					<StoreSettingsFormLoader />
				</Suspense>
			</div>
		</>
	);
}

async function StoreSettingsFormLoader() {
	const settings = await getStoreSettings();

	if (!settings) {
		return <StoreSettingsEmptyState />;
	}

	return <StoreSettingsForm settings={settings} />;
}

function StoreSettingsEmptyState() {
	return (
		<div className="border-border bg-card flex flex-col items-center gap-3 rounded-xl border p-10 text-center">
			<div className="bg-muted flex size-12 items-center justify-center rounded-full">
				<GearIcon className="text-muted-foreground size-6" aria-hidden="true" />
			</div>
			<h2 className="text-foreground text-base font-medium">
				Paramètres de la boutique non initialisés
			</h2>
			<p className="text-muted-foreground max-w-md text-sm">
				La configuration n'a pas pu être chargée. Vérifiez que la base de données est joignable et
				que la migration initiale a bien été appliquée.
			</p>
		</div>
	);
}
