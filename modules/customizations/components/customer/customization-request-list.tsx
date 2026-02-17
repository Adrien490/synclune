import { Button } from "@/shared/components/ui/button";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import type { UserCustomizationRequest } from "../../data/get-user-customization-requests";
import { CustomizationRequestCard } from "./customization-request-card";

interface CustomizationRequestListProps {
	requestsPromise: Promise<UserCustomizationRequest[] | null>;
}

export function CustomizationRequestList({
	requestsPromise,
}: CustomizationRequestListProps) {
	const requests = use(requestsPromise);

	if (!requests || requests.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 border border-dashed border-border rounded-lg">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
					<Sparkles
						className="h-6 w-6 text-muted-foreground"
						aria-hidden="true"
					/>
				</div>
				<p className="text-sm text-muted-foreground mb-4">
					Aucune demande de personnalisation
				</p>
				<Button asChild>
					<Link href="/personnalisation">
						Faire une demande
					</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h2 className="text-lg font-semibold text-foreground">
						Mes demandes
					</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Suivez l'avancement de vos demandes de personnalisation
					</p>
				</div>
				<Button asChild size="sm">
					<Link href="/personnalisation">Nouvelle demande</Link>
				</Button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{requests.map((request) => (
					<CustomizationRequestCard
						key={request.id}
						request={request}
					/>
				))}
			</div>
		</div>
	);
}
