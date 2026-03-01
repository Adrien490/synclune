import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { getUserAddresses } from "../data/get-user-addresses";
import { ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";
import { use } from "react";

interface AddressInfoCardProps {
	addressesPromise: ReturnType<typeof getUserAddresses>;
}

export function AddressInfoCard({ addressesPromise }: AddressInfoCardProps) {
	const addresses = use(addressesPromise);
	const defaultAddress = addresses?.find((addr) => addr.isDefault);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-lg/7 font-semibold tracking-tight antialiased">
					<MapPin className="h-4 w-4" />
					Adresse de livraison
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{defaultAddress ? (
					<div className="space-y-1 rounded-lg border p-3">
						<p className="text-sm/6 font-medium tracking-normal antialiased">
							{defaultAddress.firstName} {defaultAddress.lastName}
						</p>
						<p className="text-muted-foreground text-sm/6 tracking-normal antialiased">
							{defaultAddress.address1}
						</p>
						{defaultAddress.address2 && (
							<p className="text-muted-foreground text-sm/6 tracking-normal antialiased">
								{defaultAddress.address2}
							</p>
						)}
						<p className="text-muted-foreground text-sm/6 tracking-normal antialiased">
							{defaultAddress.postalCode} {defaultAddress.city}
						</p>
					</div>
				) : (
					<div className="rounded-lg border border-dashed p-4 text-center">
						<p className="text-muted-foreground mb-2 text-sm">Aucune adresse par défaut</p>
					</div>
				)}
				<Button asChild variant="outline" size="sm" className="w-full">
					<Link href="/adresses">
						Gérer mes adresses
						<ArrowRight className="ml-2 h-4 w-4" />
					</Link>
				</Button>
			</CardContent>
		</Card>
	);
}
