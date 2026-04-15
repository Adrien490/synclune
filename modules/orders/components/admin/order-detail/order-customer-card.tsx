import { ExternalLink, Phone, User } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { OrderCustomerCardProps } from "./types";

export function OrderCustomerCard({ order }: OrderCustomerCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<User className="h-5 w-5" aria-hidden="true" />
					Client
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div>
					{order.userId ? (
						<Link
							href={`/admin/clients?search=${encodeURIComponent(order.customerEmail)}`}
							className="hover:text-primary inline-flex items-center gap-1 font-medium transition-colors hover:underline"
							aria-label={`Voir le profil de ${order.customerName}`}
						>
							{order.customerName}
							<ExternalLink className="h-3 w-3" aria-hidden="true" />
						</Link>
					) : (
						<>
							<p className="font-medium">{order.customerName}</p>
							<p className="text-muted-foreground text-xs">Client non enregistré</p>
						</>
					)}
					<p className="text-muted-foreground text-sm">{order.customerEmail}</p>
					{order.customerPhone && (
						<p className="text-muted-foreground flex items-center gap-1 text-sm">
							<Phone className="h-3 w-3" aria-hidden="true" />
							{order.customerPhone}
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
