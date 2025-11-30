import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { getUserAddresses } from "../../data/get-user-addresses";
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
				<CardTitle className="text-lg/7 tracking-tight antialiased font-semibold flex items-center gap-2">
					<MapPin className="h-4 w-4" />
					Adresse de livraison
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{defaultAddress ? (
					<div className="rounded-lg border p-3 space-y-1">
						<p className="text-sm/6 tracking-normal antialiased font-medium">
							{defaultAddress.firstName} {defaultAddress.lastName}
						</p>
						<p className="text-sm/6 tracking-normal antialiased text-muted-foreground">
							{defaultAddress.address1}
						</p>
						{defaultAddress.address2 && (
							<p className="text-sm/6 tracking-normal antialiased text-muted-foreground">
								{defaultAddress.address2}
							</p>
						)}
						<p className="text-sm/6 tracking-normal antialiased text-muted-foreground">
							{defaultAddress.postalCode} {defaultAddress.city}
						</p>
					</div>
				) : (
					<div className="rounded-lg border border-dashed p-4 text-center">
						<p className="text-sm text-muted-foreground mb-2">
							Aucune adresse par défaut
						</p>
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
