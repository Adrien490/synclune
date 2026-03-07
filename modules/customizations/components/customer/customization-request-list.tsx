import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { use } from "react";

import { Button } from "@/shared/components/ui/button";

import type { UserCustomizationRequest } from "../../data/get-user-customization-requests";
import { CustomizationRequestCard } from "./customization-request-card";

interface CustomizationRequestListProps {
	requestsPromise: Promise<UserCustomizationRequest[] | null>;
}

export function CustomizationRequestList({ requestsPromise }: CustomizationRequestListProps) {
	const requests = use(requestsPromise);

	if (!requests || requests.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Sparkles className="size-6" />
					</EmptyMedia>
					<EmptyTitle>Aucune demande de personnalisation</EmptyTitle>
					<EmptyDescription>
						Créez un bijou unique qui vous ressemble grâce à notre service de personnalisation.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button asChild>
						<Link href="/personnalisation">Faire une demande</Link>
					</Button>
				</EmptyContent>
			</Empty>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
			{requests.map((request) => (
				<CustomizationRequestCard key={request.id} request={request} />
			))}
		</div>
	);
}
