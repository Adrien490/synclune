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

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg flex items-center gap-2">
					<MapPin className="h-5 w-5" />
					Adresse de livraison
				</CardTitle>
			</CardHeader>
			<CardContent>
				{formatAddress(shippingAddress)}
			</CardContent>
		</Card>
	);
}
