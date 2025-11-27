import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { MapPin } from "lucide-react";

interface OrderAddressesCardProps {
	order: {
		shippingFirstName: string;
		shippingLastName: string;
		shippingAddress1: string;
		shippingAddress2: string | null;
		shippingPostalCode: string;
		shippingCity: string;
		shippingCountry: string;
		shippingPhone: string;
		billingFirstName: string;
		billingLastName: string;
		billingAddress1: string;
		billingAddress2: string | null;
		billingPostalCode: string;
		billingCity: string;
		billingCountry: string;
	};
}

function formatAddress(address: {
	firstName: string;
	lastName: string;
	address1: string;
	address2: string | null;
	postalCode: string;
	city: string;
	country: string;
	phone?: string;
}) {
	return (
		<div className="text-sm space-y-0.5">
			<p className="font-medium">
				{address.firstName} {address.lastName}
			</p>
			<p className="text-muted-foreground">{address.address1}</p>
			{address.address2 && (
				<p className="text-muted-foreground">{address.address2}</p>
			)}
			<p className="text-muted-foreground">
				{address.postalCode} {address.city}
			</p>
			<p className="text-muted-foreground">{address.country}</p>
			{address.phone && (
				<p className="text-muted-foreground mt-1">{address.phone}</p>
			)}
		</div>
	);
}

export function OrderAddressesCard({ order }: OrderAddressesCardProps) {
	const shippingAddress = {
		firstName: order.shippingFirstName,
		lastName: order.shippingLastName,
		address1: order.shippingAddress1,
		address2: order.shippingAddress2,
		postalCode: order.shippingPostalCode,
		city: order.shippingCity,
		country: order.shippingCountry,
		phone: order.shippingPhone,
	};

	const billingAddress = {
		firstName: order.billingFirstName,
		lastName: order.billingLastName,
		address1: order.billingAddress1,
		address2: order.billingAddress2,
		postalCode: order.billingPostalCode,
		city: order.billingCity,
		country: order.billingCountry,
	};

	// Check if billing is same as shipping
	const sameAddress =
		shippingAddress.firstName === billingAddress.firstName &&
		shippingAddress.lastName === billingAddress.lastName &&
		shippingAddress.address1 === billingAddress.address1 &&
		shippingAddress.postalCode === billingAddress.postalCode &&
		shippingAddress.city === billingAddress.city;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg flex items-center gap-2">
					<MapPin className="h-5 w-5" />
					Adresses
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Shipping */}
				<div>
					<h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
						Livraison
					</h4>
					{formatAddress(shippingAddress)}
				</div>

				{/* Billing (if different) */}
				{!sameAddress && (
					<div>
						<h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
							Facturation
						</h4>
						{formatAddress(billingAddress)}
					</div>
				)}

				{sameAddress && (
					<p className="text-xs text-muted-foreground italic">
						Adresse de facturation identique
					</p>
				)}
			</CardContent>
		</Card>
	);
}
