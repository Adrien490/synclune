import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/page-header";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const metadata: Metadata = {
	title: "Tableau de bord",
};

export default async function DashboardPage() {
	const user = await getCurrentUser();
	if (!user) notFound();

	const firstName = user.name?.split(" ")[0] ?? "";

	return (
		<>
			<PageHeader
				title="Tableau de bord"
				description={`Bonjour ${firstName}`}
				variant="compact"
			/>

			<Card>
				<CardHeader>
					<CardTitle>Mon profil</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					<p>
						<span className="text-muted-foreground">Nom :</span>{" "}
						{user.name}
					</p>
					<p>
						<span className="text-muted-foreground">Email :</span>{" "}
						{user.email}
					</p>
					<p>
						<span className="text-muted-foreground">
							Membre depuis :
						</span>{" "}
						{format(user.createdAt, "MMMM yyyy", { locale: fr })}
					</p>
				</CardContent>
			</Card>
		</>
	);
}
