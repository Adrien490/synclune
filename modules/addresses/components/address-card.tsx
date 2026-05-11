import { Badge } from "@/shared/components/ui/badge";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Star, Phone } from "lucide-react";
import type { UserAddress } from "../types/user-addresses.types";
import { AddressCardActions } from "./address-card-actions";
import { cn } from "@/shared/utils/cn";

function formatPhone(phone: string, country: string): string {
	// libphonenumber-js handles every shipping country supported by SHIPPING_COUNTRIES.
	// Falls back to the raw value when parsing fails (rather than crashing).
	const parsed = parsePhoneNumberFromString(
		phone,
		country as Parameters<typeof parsePhoneNumberFromString>[1],
	);
	return parsed?.formatInternational() ?? phone;
}

interface AddressCardProps {
	address: UserAddress;
}

export function AddressCard({ address }: AddressCardProps) {
	return (
		<div
			className={cn(
				"bg-card flex h-full flex-col gap-3 rounded-xl border p-4 transition-colors",
				address.isDefault ? "border-primary/50 bg-primary/5" : "hover:bg-accent/50",
			)}
		>
			{/* Header : Nom et Actions */}
			<div className="flex items-start justify-between gap-2">
				<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
					<p className="text-foreground truncate font-medium">
						{address.firstName} {address.lastName}
					</p>
					{address.isDefault && (
						<Badge variant="secondary" className="h-5 shrink-0 px-1.5">
							<Star className="mr-1 size-3 fill-current" aria-hidden="true" />
							<span className="text-xs">Par défaut</span>
						</Badge>
					)}
				</div>
				<AddressCardActions address={address} />
			</div>

			{/* Adresse complète */}
			<div className="text-muted-foreground flex-1 gap-y-0.5 text-sm">
				<p>{address.address1}</p>
				{address.address2 && <p>{address.address2}</p>}
				<p>
					{address.postalCode} {address.city}
				</p>
			</div>

			{/* Téléphone */}
			<div className="text-muted-foreground border-border/50 flex items-center gap-1.5 border-t pt-2 text-sm">
				<Phone className="size-3.5" aria-hidden="true" />
				<span className="truncate">{formatPhone(address.phone, address.country)}</span>
			</div>
		</div>
	);
}
