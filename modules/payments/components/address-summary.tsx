"use client";

import {
	COUNTRY_NAMES,
	type ShippingCountry,
} from "@/shared/constants/countries";
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
		<div className="rounded-lg border bg-card p-4 space-y-3">
			{/* En-tête avec statut validé */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground">
						<Check className="w-3 h-3" />
					</div>
					<h3 className="font-medium text-sm">Adresse de livraison</h3>
				</div>
				<button
					type="button"
					onClick={onEdit}
					className="text-sm text-muted-foreground hover:text-foreground underline hover:no-underline inline-flex items-center gap-1 transition-colors"
				>
					<Pencil className="w-3 h-3" />
					Modifier
				</button>
			</div>

			{/* Contenu de l'adresse */}
			<div className="pl-7 space-y-2 text-sm">
				{/* Nom */}
				<p className="font-medium">{address.fullName}</p>

				{/* Adresse */}
				<div className="flex items-start gap-2 text-muted-foreground">
					<MapPin className="w-4 h-4 mt-0.5 shrink-0" />
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
				<div className="flex items-center gap-2 text-muted-foreground">
					<Phone className="w-4 h-4 shrink-0" />
					<span>{address.phoneNumber}</span>
				</div>

				{/* Email (guests uniquement) */}
				{address.email && (
					<div className="flex items-center gap-2 text-muted-foreground">
						<Mail className="w-4 h-4 shrink-0" />
						<span>{address.email}</span>
					</div>
				)}
			</div>
		</div>
	);
}
