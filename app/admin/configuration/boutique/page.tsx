import { type Metadata } from "next";
import { connection } from "next/server";

import { PageHeader } from "@/shared/components/page-header";
import { getStoreSettings } from "@/modules/store-settings/data/get-store-settings";
import { StoreSettingsForm } from "@/modules/store-settings/components/admin/store-settings-form";

export const metadata: Metadata = {
	title: "Paramètres boutique - Administration",
	description: "Gérer l'ouverture et la fermeture de la boutique",
};

export default async function StoreSettingsPage() {
	await connection();

	const settings = await getStoreSettings();

	if (!settings) {
		return (
			<div className="text-muted-foreground py-12 text-center">
				Paramètres boutique introuvables. Veuillez exécuter le seed.
			</div>
		);
	}

	return (
		<>
			<PageHeader
				variant="compact"
				title="Paramètres boutique"
				description="Gérez l'ouverture et la fermeture temporaire de la boutique"
			/>

			<div className="mx-auto max-w-2xl">
				<StoreSettingsForm settings={settings} />
			</div>
		</>
	);
}
