import type { GetAccountStatsReturn } from "@/modules/users/data/get-account-stats";
import { Card, CardContent } from "@/shared/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { use } from "react";

interface AccountStatsCardsProps {
	statsPromise: Promise<GetAccountStatsReturn>;
	memberSince: Date;
}

export function AccountStatsCards({ statsPromise, memberSince }: AccountStatsCardsProps) {
	const stats = use(statsPromise);
	const totalOrders = stats?.totalOrders ?? 0;

	const memberSinceLabel = format(memberSince, "MMMM yyyy", { locale: fr });

	return (
		<dl className="grid gap-4 sm:grid-cols-2">
			<Card className="shadow-none">
				<CardContent className="py-0">
					<dt className="text-muted-foreground text-sm">Membre depuis</dt>
					<dd className="text-lg font-semibold capitalize">{memberSinceLabel}</dd>
				</CardContent>
			</Card>

			<Card className="shadow-none">
				<CardContent className="py-0">
					<dt className="text-muted-foreground text-sm">Commandes passées</dt>
					<dd className="text-lg font-semibold">
						{totalOrders} commande{totalOrders !== 1 ? "s" : ""}
					</dd>
				</CardContent>
			</Card>
		</dl>
	);
}
