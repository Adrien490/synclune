"use client"

import type { UserAddress } from "@/modules/addresses/types/user-addresses.types"
import { cn } from "@/shared/utils/cn"
import { MapPin } from "lucide-react"

interface AddressSelectorProps {
	addresses: UserAddress[]
	selectedAddressId: string | null
	onSelectAddress: (address: UserAddress) => void
}

/**
 * Accessible radio-group address selector
 * Only rendered when the user has more than one saved address
 */
export function AddressSelector({
	addresses,
	selectedAddressId,
	onSelectAddress,
}: AddressSelectorProps) {
	if (addresses.length <= 1) return null

	return (
		<fieldset className="space-y-2">
			<legend className="text-sm font-medium">Adresses enregistrées</legend>
			<div className="grid gap-2" role="radiogroup">
				{addresses.map((address) => {
					const isSelected = address.id === selectedAddressId
					const fullName = [address.firstName, address.lastName].filter(Boolean).join(" ")
					const addressLine = [address.address1, address.city].filter(Boolean).join(", ")

					return (
						<label
							key={address.id}
							className={cn(
								"flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors cursor-pointer",
								"has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50 hover:bg-muted/50"
							)}
						>
							<input
								type="radio"
								name="saved-address"
								value={address.id}
								checked={isSelected}
								onChange={() => onSelectAddress(address)}
								className="sr-only"
							/>
							<MapPin className={cn(
								"w-4 h-4 mt-0.5 shrink-0",
								isSelected ? "text-primary" : "text-muted-foreground"
							)} />
							<div className="min-w-0 flex-1">
								<p className="font-medium truncate">{fullName}</p>
								<p className="text-muted-foreground truncate">{addressLine}</p>
							</div>
							{address.isDefault && (
								<span className="text-xs text-muted-foreground shrink-0 mt-0.5">
									Par défaut
								</span>
							)}
						</label>
					)
				})}
			</div>
		</fieldset>
	)
}
