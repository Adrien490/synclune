import { searchAddress } from "@/modules/users/data/autocomplete-address-api";
import { getUserAddresses } from "@/modules/users/data/get-user-addresses";
import { AddressFormDialog } from "@/modules/users/components/address/address-form-dialog";
import { AddressList } from "@/modules/users/components/address/address-list";
import { AddressListSkeleton } from "@/modules/users/components/address/address-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { DeleteAddressAlertDialog } from "@/modules/users/components/addresses/delete-address-alert-dialog";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Mes adresses | Synclune",
	description: "Gérez vos adresses de livraison",
	robots: {
		index: false,
		follow: true,
	},
};

interface AddressesPageProps {
	searchParams: Promise<{
		q?: string;
	}>;
}

/**
 * Page de gestion des adresses utilisateur
 * Permet d'ajouter, modifier, supprimer et définir une adresse par défaut
 * Intègre l'API d'autocomplétion d'adresses via searchParams
 */
export default async function AddressesPage({
	searchParams,
}: AddressesPageProps) {
	// Récupérer les paramètres de recherche
	const params = await searchParams;
	const addressQuery = params.q || "";

	// Créer la promise pour les adresses (ne pas await pour Suspense)
	const addressesPromise = getUserAddresses();

	// Charger les suggestions d'adresses côté serveur
	const addressSuggestions =
		addressQuery.length >= 3
			? await searchAddress({ text: addressQuery, maximumResponses: 5 })
			: { addresses: [], query: "", limit: 0 };

	const breadcrumbs = [
		{ label: "Mon compte", href: "/compte" },
		{ label: "Mes adresses", href: "/adresses" },
	];

	return (
		<>
			<PageHeader
				title="Mes adresses"
				description="Gérez vos adresses de livraison pour des commandes plus rapides"
				breadcrumbs={breadcrumbs}
			/>

			<section className="bg-background py-8 relative z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<Suspense fallback={<AddressListSkeleton />}>
						<AddressList addressesPromise={addressesPromise} />
					</Suspense>
				</div>
			</section>

			{/* Dialog for creating/editing addresses with address suggestions */}
			<AddressFormDialog addressSuggestions={addressSuggestions.addresses} />

			{/* Alert dialog for deleting addresses */}
			<DeleteAddressAlertDialog />
		</>
	);
}
