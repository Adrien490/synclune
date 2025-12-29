import { MapPin, Phone } from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { CopyButton } from "@/shared/components/copy-button";
import type { OrderAddressCardProps } from "./types";

export function OrderAddressCard({ order }: OrderAddressCardProps) {
	const shippingAddressText = [
		`${order.shippingFirstName} ${order.shippingLastName}`,
		order.shippingAddress1,
		order.shippingAddress2,
		`${order.shippingPostalCode} ${order.shippingCity}`,
		order.shippingCountry,
	]
		.filter(Boolean)
		.join("\n");

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="flex items-center gap-2 text-base">
					<MapPin className="h-5 w-5" aria-hidden="true" />
					Adresse de livraison
				</CardTitle>
				<CopyButton text={shippingAddressText} label="Adresse" />
			</CardHeader>
			<CardContent>
				<address className="not-italic text-sm leading-relaxed">
					<p className="font-medium">
						{order.shippingFirstName} {order.shippingLastName}
					</p>
					<p>{order.shippingAddress1}</p>
					{order.shippingAddress2 && <p>{order.shippingAddress2}</p>}
					<p>
						{order.shippingPostalCode} {order.shippingCity}
					</p>
					<p>{order.shippingCountry}</p>
					{order.shippingPhone && (
						<p className="mt-2 flex items-center gap-1 text-muted-foreground">
							<Phone className="h-3 w-3" aria-hidden="true" />
							{order.shippingPhone}
						</p>
					)}
				</address>
			</CardContent>
		</Card>
	);
}
