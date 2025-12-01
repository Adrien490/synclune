"use client";

import { use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Crown, Mail, ShoppingBag } from "lucide-react";
import type { GetTopCustomersReturn } from "../../types/dashboard.types";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface TopCustomersListProps {
	listPromise: Promise<GetTopCustomersReturn>;
}

export function TopCustomersList({ listPromise }: TopCustomersListProps) {
	const { customers } = use(listPromise);

	if (customers.length === 0) {
		return (
			<Card className="border-l-4 border-primary/30">
				<CardHeader>
					<CardTitle className="text-lg flex items-center gap-2">
						<Crown className="h-5 w-5 text-yellow-500" />
						Meilleurs clients
					</CardTitle>
					<CardDescription>Aucun client sur cette periode</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card className="border-l-4 border-primary/30 bg-gradient-to-br from-primary/3 to-transparent hover:shadow-lg transition-all duration-300">
			<CardHeader>
				<CardTitle className="text-xl font-semibold tracking-wide flex items-center gap-2">
					<Crown className="h-5 w-5 text-yellow-500" />
					Meilleurs clients
				</CardTitle>
				<CardDescription className="text-sm">
					Top {customers.length} par chiffre d'affaires
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{customers.map((customer, index) => (
						<div
							key={customer.userId}
							className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
						>
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
									{index + 1}
								</div>
								<div>
									<p className="font-medium">{customer.name}</p>
									<p className="text-xs text-muted-foreground flex items-center gap-1">
										<Mail className="h-3 w-3" />
										{customer.email}
									</p>
								</div>
							</div>
							<div className="text-right">
								<p className="font-semibold text-primary">
									{(customer.totalSpent / 100).toFixed(2)} €
								</p>
								<p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
									<ShoppingBag className="h-3 w-3" />
									{customer.ordersCount} cmd • {formatDistanceToNow(customer.lastOrderDate, { addSuffix: true, locale: fr })}
								</p>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
