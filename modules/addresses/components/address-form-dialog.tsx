"use client";

import { Autocomplete } from "@/shared/components/autocomplete";
import { useAppForm } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { Label } from "@/shared/components/ui/label";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { useCreateAddress } from "@/modules/addresses/hooks/use-create-address";
import type { UserAddress } from "@/modules/addresses/types/user-addresses.types";
import type { SearchAddressResult } from "@/modules/addresses/types/search-address.types";
import { useUpdateAddress } from "@/modules/addresses/hooks/use-update-address";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { ActionStatus } from "@/shared/types/server-action";
import { CheckCircle2, XCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { ADDRESS_DIALOG_ID } from "../constants/dialog.constants";
import {
	addressFormSchema,
	addressFormDefaultValues,
} from "../schemas/address-form.schema";

interface AddressDialogData extends Record<string, unknown> {
	address?: UserAddress;
}

interface AddressFormDialogProps {
	addressSuggestions?: SearchAddressResult[];
}

export function AddressFormDialog({
	addressSuggestions = [],
}: AddressFormDialogProps) {
	const { isOpen, close, data } =
		useDialog<AddressDialogData>(ADDRESS_DIALOG_ID);
	const address = data?.address;

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<ResponsiveDialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
				{/* Key pattern: remount form when address changes */}
				<AddressFormContent
					key={address?.id ?? "new"}
					address={address}
					addressSuggestions={addressSuggestions}
					onClose={close}
				/>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

interface AddressFormContentProps {
	address?: UserAddress;
	addressSuggestions: SearchAddressResult[];
	onClose: () => void;
}

function AddressFormContent({
	address,
	addressSuggestions,
	onClose,
}: AddressFormContentProps) {
	const mode = address ? "edit" : "create";

	// Next.js navigation hooks
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	// Transition pour la navigation
	const [isPendingAddress, startAddressTransition] = useTransition();

	// TanStack Form setup avec validation Zod - defaultValues basées sur l'address
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

	// Address hooks with success callback to close dialog
	const createHook = useCreateAddress({
		onSuccess: onClose,
	});

	const updateHook = useUpdateAddress(address?.id ?? "", {
		onSuccess: onClose,
	});

	const { action, isPending, state } =
		mode === "create" ? createHook : updateHook;

	return (
		<>
			<ResponsiveDialogHeader className="shrink-0">
				<ResponsiveDialogTitle>
					{mode === "create" ? "Ajouter une adresse" : "Modifier l'adresse"}
				</ResponsiveDialogTitle>
			</ResponsiveDialogHeader>

			<form
				action={action}
				className="flex flex-col flex-1 min-h-0"
				onSubmit={() => form.handleSubmit()}
			>
					{/* Contenu scrollable */}
					<div className="flex-1 overflow-y-auto space-y-6 pr-2">
					{/* Success message */}
					{state?.status === ActionStatus.SUCCESS && state.message && (
						<Alert className="bg-primary/10 border-primary/20">
							<CheckCircle2 className="text-primary" aria-hidden="true" />
							<AlertDescription className="text-primary font-medium">
								{state.message}
							</AlertDescription>
						</Alert>
					)}

					{/* Error message */}
					{state?.status !== ActionStatus.SUCCESS &&
						state?.status !== ActionStatus.INITIAL &&
						state?.message && (
							<Alert variant="destructive">
								<XCircle aria-hidden="true" />
								<AlertDescription className="font-medium">
									{state.message}
								</AlertDescription>
							</Alert>
						)}

					<RequiredFieldsNote />

					<div className="space-y-4">
						{/* Nom et Prénom */}
						<div className="grid gap-4 sm:grid-cols-2">
							<form.AppField name="firstName">
								{(field) => (
									<field.InputField
										label="Prénom"
										type="text"
										autoComplete="given-name"
										autoCapitalize="words"
										enterKeyHint="next"
										disabled={isPending}
										required
									/>
								)}
							</form.AppField>

							<form.AppField name="lastName">
								{(field) => (
									<field.InputField
										label="Nom"
										type="text"
										autoComplete="family-name"
										autoCapitalize="words"
										enterKeyHint="next"
										disabled={isPending}
										required
									/>
								)}
							</form.AppField>
						</div>

						{/* Adresse avec autocomplétion */}
						<form.AppField
							name="address1"
							asyncDebounceMs={300}
							validators={{
								onChangeAsync: async ({ value }) => {
									// Mise à jour de l'URL avec debounce de 300ms pour l'autocomplétion
									if (value.length >= 3) {
										const params = new URLSearchParams(searchParams.toString());
										params.set("q", value);

										startAddressTransition(() => {
											router.replace(`${pathname}?${params.toString()}`, {
												scroll: false,
											});
										});
									} else {
										const params = new URLSearchParams(searchParams.toString());
										params.delete("q");

										startAddressTransition(() => {
											router.replace(`${pathname}?${params.toString()}`, {
												scroll: false,
											});
										});
									}
									return undefined;
								},
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>
										Adresse
										<span className="text-destructive ml-1">*</span>
									</Label>
									<Autocomplete<SearchAddressResult>
										name={field.name}
										value={field.state.value}
										onChange={(value) => field.handleChange(value)}
										onSelect={(selectedAddress) => {
											// Remplir automatiquement les champs avec l'adresse sélectionnée
											field.handleChange(
												selectedAddress.street && selectedAddress.housenumber
													? `${selectedAddress.housenumber} ${selectedAddress.street}`
													: selectedAddress.label
											);

											// Mise à jour des autres champs
											if (selectedAddress.postcode) {
												form.setFieldValue(
													"postalCode",
													selectedAddress.postcode
												);
											}
											if (selectedAddress.city) {
												form.setFieldValue("city", selectedAddress.city);
											}
										}}
										items={addressSuggestions}
										getItemLabel={(item) => item.label}
										getItemDescription={(item) =>
											item.postcode && item.city
												? `${item.postcode} ${item.city}`
												: item.city || null
										}
										placeholder="Rechercher une adresse..."
										isLoading={isPendingAddress}
										disabled={isPending}
										noResultsMessage="Aucune adresse trouvée"
										minQueryLength={3}
										debounceMs={0}
									/>
									{field.state.meta.errors.length > 0 && (
										<p
											className="text-sm text-destructive font-medium"
											role="alert"
										>
											{field.state.meta.errors.join(", ")}
										</p>
									)}
								</div>
							)}
						</form.AppField>

						{/* Complément d'adresse */}
						<form.AppField name="address2">
							{(field) => (
								<div className="space-y-2">
									<field.InputField
										label="Complément d'adresse (optionnel)"
										type="text"
										autoComplete="address-line2"
										enterKeyHint="next"
										disabled={isPending}
									/>
									<p className="text-xs text-muted-foreground">
										Appartement, bâtiment, etc.
									</p>
								</div>
							)}
						</form.AppField>

						{/* Code postal et Ville */}
						<div className="grid gap-4 sm:grid-cols-2">
							<form.AppField name="postalCode">
								{(field) => (
									<field.InputField
										label="Code postal"
										type="text"
										inputMode="numeric"
										autoComplete="postal-code"
										pattern="[0-9]{5}"
										enterKeyHint="next"
										disabled={isPending}
										maxLength={5}
										required
									/>
								)}
							</form.AppField>

							<form.AppField name="city">
								{(field) => (
									<field.InputField
										label="Ville"
										type="text"
										autoComplete="address-level2"
										autoCapitalize="words"
										enterKeyHint="next"
										disabled={isPending}
										required
									/>
								)}
							</form.AppField>
						</div>

						{/* Pays */}
						<form.AppField name="country">
							{(field) => (
								<div className="space-y-2">
									<field.InputField
										label="Pays"
										type="text"
										disabled={true}
										required
									/>
									<p className="text-xs text-muted-foreground">
										Actuellement, seules les livraisons en France sont
										disponibles
									</p>
								</div>
							)}
						</form.AppField>

						{/* Téléphone */}
						<form.AppField name="phone">
							{(field) => (
								<field.PhoneField
									label="Téléphone"
									required
									defaultCountry="FR"
									placeholder="06 12 34 56 78"
									disabled={isPending}
								/>
							)}
						</form.AppField>
					</div>

					</div>
					{/* Fin du contenu scrollable */}

					{/* Footer fixe */}
				<div className="shrink-0 flex justify-end pt-4 border-t mt-4">
					<form.Subscribe selector={(state) => [state.canSubmit]}>
						{([canSubmit]) => (
							<Button disabled={!canSubmit || isPending} type="submit">
								{isPending
									? "Enregistrement..."
									: mode === "create"
										? "Ajouter"
										: "Enregistrer"}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</form>
		</>
	);
}
