"use client";

import { useAppForm } from "@/shared/components/forms";

import { addressFormSchema, addressFormDefaultValues } from "../schemas/address-form.schema";
import type { UserAddress } from "../types/user-addresses.types";

/**
 * Hook partagé qui instancie le formulaire d'adresse (TanStack Form + Zod).
 *
 * Utilisé à la fois par la dialog desktop (`AddressFormDialog`) et la page
 * dédiée mobile (`CreateAddressForm`) pour garantir des `defaultValues` et
 * une validation strictement identiques côté création/édition.
 */
export function useAddressForm(address?: UserAddress) {
	const form = useAppForm({
		defaultValues: address
			? {
					firstName: address.firstName,
					lastName: address.lastName,
					address1: address.address1,
					address2: address.address2 ?? undefined,
					postalCode: address.postalCode,
					city: address.city,
					country: address.country,
					phone: address.phone,
				}
			: addressFormDefaultValues,
		validators: {
			onChange: addressFormSchema,
		},
	});

	return { form };
}

export type AddressFormInstance = ReturnType<typeof useAddressForm>["form"];
