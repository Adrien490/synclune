"use client";

import { COUNTRY_NAMES, type ShippingCountry } from "@/shared/constants/countries";
import { Check, MapPin, Pencil, Phone, Mail } from "lucide-react";

export interface SubmittedAddress {
	fullName: string;
	addressLine1: string;
	addressLine2?: string;
	city: string;
	postalCode: string;
	country: ShippingCountry;
	phoneNumber: string;
	email?: string;
}

interface AddressSummaryProps {
	address: SubmittedAddress;
	onEdit: () => void;
}

/**
 * Résumé de l'adresse de livraison après validation
 * Conforme aux guidelines Baymard : toujours afficher un résumé
 * des informations saisies pour permettre la vérification
 */
export function AddressSummary({ address, onEdit }: AddressSummaryProps) {
	const countryName = COUNTRY_NAMES[address.country] || address.country;

	return (
		<div className="border-primary/10 bg-primary/[0.02] space-y-3 rounded-xl border p-4">
			{/* En-tête avec statut validé */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="text-primary-foreground from-primary to-primary/80 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br shadow-sm">
						<Check className="h-3.5 w-3.5" />
					</div>
					<h3 className="text-sm font-medium">Adresse de livraison</h3>
				</div>
				<button
					type="button"
					onClick={onEdit}
					aria-label="Modifier l'adresse de livraison"
					className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm underline transition-colors hover:no-underline"
				>
					<Pencil className="h-3 w-3" />
					Modifier
				</button>
			</div>

			{/* Contenu de l'adresse */}
			<div className="space-y-2 pl-7 text-sm">
				{/* Nom */}
				<p className="font-medium">{address.fullName}</p>

				{/* Adresse */}
				<div className="text-muted-foreground flex items-start gap-2">
					<MapPin className="mt-0.5 h-4 w-4 shrink-0" />
					<div>
						<p>{address.addressLine1}</p>
						{address.addressLine2 && <p>{address.addressLine2}</p>}
						<p>
							{address.postalCode} {address.city}
						</p>
						{address.country !== "FR" && <p>{countryName}</p>}
					</div>
				</div>

				{/* Téléphone */}
				<div className="text-muted-foreground flex items-center gap-2">
					<Phone className="h-4 w-4 shrink-0" />
					<span>{address.phoneNumber}</span>
				</div>

				{/* Email (guests uniquement) */}
				{address.email && (
					<div className="text-muted-foreground flex items-center gap-2">
						<Mail className="h-4 w-4 shrink-0" />
						<span>{address.email}</span>
					</div>
				)}
			</div>
		</div>
	);
}
