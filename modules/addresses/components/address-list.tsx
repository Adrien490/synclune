import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import type { UserAddress } from "../types/user-addresses.types";
import { MapPin } from "lucide-react";
import { use } from "react";
import { AddressGrid } from "./address-grid";
import { CreateAddressButton } from "./create-address-button";

interface AddressListProps {
	addressesPromise: Promise<UserAddress[] | null>;
}

export function AddressList({ addressesPromise }: AddressListProps) {
	const addresses = use(addressesPromise);

	return (
		<section className="space-y-6">
			{/* Address list or empty state */}
			{!addresses || addresses.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<MapPin className="size-6" />
						</EmptyMedia>
						<EmptyTitle>Aucune adresse enregistrée</EmptyTitle>
						<EmptyDescription>
							Ajoutez une adresse de livraison pour accélérer vos prochaines commandes.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<CreateAddressButton>Ajouter une adresse</CreateAddressButton>
					</EmptyContent>
				</Empty>
			) : (
				<>
					<div className="flex justify-end">
						<CreateAddressButton size="sm">Ajouter</CreateAddressButton>
					</div>
					<AddressGrid addresses={addresses} />
				</>
			)}
		</section>
	);
}
