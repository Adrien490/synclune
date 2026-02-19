import { Card, CardContent } from "@/shared/components/ui/card";
import type { AccountStats } from "@/modules/users/data/get-account-stats";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { use } from "react";

interface AccountStatsCardsProps {
	statsPromise: Promise<AccountStats>;
	memberSince: Date;
}

export function AccountStatsCards({
	statsPromise,
	memberSince,
}: AccountStatsCardsProps) {
	const { totalOrders } = use(statsPromise);

	const memberSinceLabel = format(memberSince, "MMMM yyyy", { locale: fr });

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<Card>
				<CardContent className="pt-6">
					<p className="text-sm text-muted-foreground">Membre depuis</p>
					<p className="text-lg font-semibold capitalize">
						{memberSinceLabel}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="pt-6">
					<p className="text-sm text-muted-foreground">Commandes passées</p>
					<p className="text-lg font-semibold">
						{totalOrders} commande{totalOrders !== 1 ? "s" : ""}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
