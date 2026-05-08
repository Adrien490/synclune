import { StoreSettingsFormSkeleton } from "@/modules/store-settings/components/admin/store-settings-form-skeleton";
import { PageHeader } from "@/shared/components/page-header";

export default function StoreSettingsLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des paramètres boutique">
			<span className="sr-only">Chargement...</span>

			<PageHeader
				variant="compact"
				title="Paramètres boutique"
				description="Gérez l'ouverture, la fermeture et la programmation de la boutique"
			/>

			<div className="mx-auto max-w-2xl">
				<StoreSettingsFormSkeleton />
			</div>
		</div>
	);
}
