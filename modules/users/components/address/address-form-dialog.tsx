"use client";

import { Autocomplete } from "@/shared/components/autocomplete";
import { useAppForm } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
import { useCreateAddress } from "@/modules/users/hooks/use-create-address";
import type { UserAddress } from "@/modules/users/data/get-user-addresses";
import type { SearchAddressResult } from "@/modules/users/data/types";
import { useUpdateAddress } from "@/modules/users/hooks/use-update-address";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { ActionStatus } from "@/shared/types/server-action";
import { CheckCircle2, XCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useTransition } from "react";
import { toast } from "sonner";

export const ADDRESS_DIALOG_ID = "address-form";

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
	const mode = address ? "edit" : "create";

	// Next.js navigation hooks
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	// Transition pour la navigation
	const [isPendingAddress, startAddressTransition] = useTransition();

	// TanStack Form setup
	const form = useAppForm({
		defaultValues: {
			firstName: "",
			lastName: "",
			address1: "",
			address2: "",
			postalCode: "",
			city: "",
			country: "FR",
			phone: "",
		},
	});

	// Reset form values when address data changes
	useEffect(() => {
		if (address) {
			form.reset({
				firstName: address.firstName,
				lastName: address.lastName,
				address1: address.address1,
				address2: address.address2 ?? "",
				postalCode: address.postalCode,
				city: address.city,
				country: address.country,
				phone: address.phone,
			});
		} else {
			form.reset({
				firstName: "",
				lastName: "",
				address1: "",
				address2: "",
				postalCode: "",
				city: "",
				country: "FR",
				phone: "",
			});
		}
	}, [address, form]);

	// Address hooks with success callback to close dialog and reset form
	const createHook = useCreateAddress({
		onSuccess: () => {
			close();
			form.reset();
		},
	});

	const updateHook = useUpdateAddress(address?.id ?? "", {
		onSuccess: () => {
			close();
		},
	});

	const { action, isPending, state } =
		mode === "create" ? createHook : updateHook;

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					if (isPending) {
						// Show feedback to user if trying to close during submit
						toast.info("Enregistrement en cours, veuillez patienter...", {
							duration: 2000,
						});
					} else {
						close();
					}
				}
			}}
		>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{mode === "create" ? "Ajouter une adresse" : "Modifier l'adresse"}
					</DialogTitle>
				</DialogHeader>

				<form
					action={action}
					className="space-y-6"
					onSubmit={() => form.handleSubmit()}
				>
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
							<form.AppField
								name="firstName"
								validators={{
									onChange: ({ value }: { value: string }) => {
										if (!value || value.length < 2) {
											return "Le prénom doit contenir au moins 2 caractères";
										}
										if (value.length > 50) {
											return "Le prénom ne peut pas dépasser 50 caractères";
										}
										return undefined;
									},
								}}
							>
								{(field) => (
									<field.InputField
										label="Prénom"
										type="text"
										disabled={isPending}
										required
									/>
								)}
							</form.AppField>

							<form.AppField
								name="lastName"
								validators={{
									onChange: ({ value }: { value: string }) => {
										if (!value || value.length < 2) {
											return "Le nom doit contenir au moins 2 caractères";
										}
										if (value.length > 50) {
											return "Le nom ne peut pas dépasser 50 caractères";
										}
										return undefined;
									},
								}}
							>
								{(field) => (
									<field.InputField
										label="Nom"
										type="text"
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
								onChange: ({ value }: { value: string }) => {
									if (!value || value.length < 5) {
										return "L'adresse doit contenir au moins 5 caractères";
									}
									if (value.length > 100) {
										return "L'adresse ne peut pas dépasser 100 caractères";
									}
									return undefined;
								},
								onChangeAsync: async ({ value }) => {
									// Mise à jour de l'URL avec debounce de 300ms
									if (value.length >= 3) {
										const params = new URLSearchParams(searchParams.toString());
										params.set("q", value);

										startAddressTransition(() => {
											// Navigation avec transition - la page serveur fetche les suggestions
											router.replace(`${pathname}?${params.toString()}`, {
												scroll: false,
											});
										});
									} else {
										// Nettoyer l'URL si moins de 3 caractères
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
								<field.InputField
									label="Complément d'adresse (optionnel)"
									type="text"
									placeholder="Appartement, bâtiment, etc."
									disabled={isPending}
								/>
							)}
						</form.AppField>

						{/* Code postal et Ville */}
						<div className="grid gap-4 sm:grid-cols-2">
							<form.AppField
								name="postalCode"
								validators={{
									onChange: ({ value }: { value: string }) => {
										if (!value) {
											return "Le code postal est requis";
										}
										if (!/^[0-9]{5}$/.test(value)) {
											return "Le code postal doit contenir 5 chiffres";
										}
										return undefined;
									},
								}}
							>
								{(field) => (
									<field.InputField
										label="Code postal"
										type="text"
										disabled={isPending}
										maxLength={5}
										required
									/>
								)}
							</form.AppField>

							<form.AppField
								name="city"
								validators={{
									onChange: ({ value }: { value: string }) => {
										if (!value || value.length < 2) {
											return "La ville doit contenir au moins 2 caractères";
										}
										if (value.length > 50) {
											return "La ville ne peut pas dépasser 50 caractères";
										}
										return undefined;
									},
								}}
							>
								{(field) => (
									<field.InputField
										label="Ville"
										type="text"
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
						<form.AppField
							name="phone"
							validators={{
								onChange: ({ value }: { value: string }) => {
									if (!value) {
										return "Le téléphone est requis";
									}
									// Normalize: remove all spaces before validation
									const normalized = value.replace(/\s/g, "");
									if (!/^(\+33|0)[1-9](\d{2}){4}$/.test(normalized)) {
										return "Format invalide (ex: 0612345678 ou +33612345678)";
									}
									return undefined;
								},
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<field.InputField
										label="Téléphone"
										type="tel"
										placeholder="0612345678"
										disabled={isPending}
										required
									/>
									<p className="text-xs text-muted-foreground">
										Format : 0612345678 ou +33612345678
									</p>
								</div>
							)}
						</form.AppField>
					</div>

					{/* Submit button */}
					<div className="flex justify-end pt-4">
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
			</DialogContent>
		</Dialog>
	);
}
