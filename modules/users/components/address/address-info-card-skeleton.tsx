import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { MapPin } from "lucide-react";

export function AddressInfoCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg font-semibold flex items-center gap-2">
					<MapPin className="h-4 w-4" />
					Adresse de livraison
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="rounded-lg border p-3 space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-3 w-40" />
					<Skeleton className="h-3 w-36" />
				</div>
				<Skeleton className="h-9 w-full" />
			</CardContent>
		</Card>
	);
}
