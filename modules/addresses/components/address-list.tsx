import {
	Empty,
	EmptyContent,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
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
		<section aria-labelledby="addresses-heading" className="space-y-6">
			{/* Section header */}
			<div className="flex items-center justify-between gap-4">
				<div>
					<h2 id="addresses-heading" className="text-lg font-semibold text-foreground">
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
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<MapPin className="size-6" />
						</EmptyMedia>
						<EmptyTitle>Aucune adresse enregistrée</EmptyTitle>
					</EmptyHeader>
					<EmptyContent>
						<CreateAddressButton>Ajouter une adresse</CreateAddressButton>
					</EmptyContent>
				</Empty>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{addresses.map((address) => (
						<AddressCard key={address.id} address={address} />
					))}
				</div>
			)}
		</section>
	);
}
