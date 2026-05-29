"use client";

import { useOptimistic, useTransition } from "react";

import { useSetDefaultAddress } from "../hooks/use-set-default-address";
import type { UserAddress } from "../types/user-addresses.types";
import { AddressCard } from "./address-card";

interface AddressGridProps {
	addresses: UserAddress[];
}

/**
 * Grille client des adresses avec mise à jour optimiste de l'adresse par défaut.
 *
 * Possède l'état optimiste (`useOptimistic`) au niveau de la liste pour que le
 * badge « Par défaut » se déplace instantanément d'une carte à l'autre au clic,
 * sans attendre la revalidation serveur (l'ancienne et la nouvelle carte sont
 * mises à jour de façon cohérente — pas de double badge transitoire).
 */
export function AddressGrid({ addresses }: AddressGridProps) {
	const serverDefaultId = addresses.find((a) => a.isDefault)?.id ?? null;
	const [optimisticDefaultId, setOptimisticDefaultId] = useOptimistic(serverDefaultId);
	const { action } = useSetDefaultAddress();
	const [isPending, startTransition] = useTransition();

	const handleSetDefault = (addressId: string) => {
		const formData = new FormData();
		formData.append("addressId", addressId);
		startTransition(() => {
			setOptimisticDefaultId(addressId);
			action(formData);
		});
	};

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{addresses.map((address) => (
				<AddressCard
					key={address.id}
					address={address}
					isDefault={optimisticDefaultId === address.id}
					onSetDefault={handleSetDefault}
					isSettingDefault={isPending}
				/>
			))}
		</div>
	);
}
