import { Badge } from "@/shared/components/ui/badge";
import { Star, Phone } from "lucide-react";
import type { UserAddress } from "../types/user-addresses.types";
import { AddressCardActions } from "./address-card-actions";
import { cn } from "@/shared/utils/cn";

function formatPhone(phone: string): string {
	// Format FR numbers: +33612345678 → +33 6 12 34 56 78
	const match = phone.match(/^\+33(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/);
	if (match) {
		return `+33 ${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`;
	}
	// Format 0X XX XX XX XX
	const match2 = phone.match(/^0(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/);
	if (match2) {
		return `0${match2[1]} ${match2[2]} ${match2[3]} ${match2[4]} ${match2[5]}`;
	}
	return phone;
}

interface AddressCardProps {
	address: UserAddress;
}

export function AddressCard({ address }: AddressCardProps) {
	return (
		<div
			className={cn(
				"bg-card flex h-full flex-col gap-3 rounded-lg border p-4 transition-colors",
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
							<Star className="mr-1 h-3 w-3 fill-current" aria-hidden="true" />
							<span className="text-xs">Par défaut</span>
						</Badge>
					)}
				</div>
				<AddressCardActions address={address} />
			</div>

			{/* Adresse complète */}
			<div className="text-muted-foreground flex-1 space-y-0.5 text-sm">
				<p>{address.address1}</p>
				{address.address2 && <p>{address.address2}</p>}
				<p>
					{address.postalCode} {address.city}
				</p>
			</div>

			{/* Téléphone */}
			<div className="text-muted-foreground border-border/50 flex items-center gap-1.5 border-t pt-2 text-sm">
				<Phone className="h-3.5 w-3.5" aria-hidden="true" />
				<span className="truncate">{formatPhone(address.phone)}</span>
			</div>
		</div>
	);
}
