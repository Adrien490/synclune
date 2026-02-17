import type { UserAddress } from "../types/user-addresses.types";
import { MapPin } from "lucide-react";
import { use } from "react";
import { AddressCard } from "./address-card";
import { CreateAddressButton } from "./create-address-button";

interface AddressListProps {
	addressesPromise: Promise<UserAddress[] | null>;
}

export function AddressList({ addressesPromise }: AddressListProps) {
	const addresses = use(addressesPromise);

	return (
		<div className="space-y-6">
			{/* Section header */}
			<div className="flex items-center justify-between gap-4">
				<div>
					<h2 className="text-lg font-semibold text-foreground">
						Adresses enregistrées
					</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Gérez vos adresses de livraison
					</p>
				</div>
				{addresses && addresses.length > 0 && (
					<CreateAddressButton size="sm">
						Ajouter
					</CreateAddressButton>
				)}
			</div>

			{/* Address list or empty state */}
			{!addresses || addresses.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12 border border-dashed border-border rounded-lg">
					<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
						<MapPin className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
					</div>
					<p className="text-sm text-muted-foreground mb-4">
						Aucune adresse enregistrée
					</p>
					<CreateAddressButton>
						Ajouter une adresse
					</CreateAddressButton>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{addresses.map((address) => (
						<AddressCard key={address.id} address={address} />
					))}
				</div>
			)}
		</div>
	);
}
