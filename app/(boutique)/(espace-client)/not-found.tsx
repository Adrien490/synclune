import { Button } from "@/shared/components/ui/button";
import {
	Empty,
	EmptyActions,
	EmptyContent,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { ROUTES } from "@/shared/constants/urls";
import { Search } from "lucide-react";
import Link from "next/link";

export default function EspaceClientNotFound() {
	return (
		<div className="py-12">
			<Empty variant="borderless" size="lg">
				<EmptyHeader>
					<EmptyMedia variant="default">
						<Search className="text-muted-foreground size-6" />
					</EmptyMedia>
					<EmptyTitle>Page introuvable</EmptyTitle>
				</EmptyHeader>
				<EmptyContent>
					<p className="text-muted-foreground max-w-md">
						L'element que vous recherchez n'existe pas ou a ete supprime.
					</p>
					<EmptyActions>
						<Button asChild size="lg">
							<Link href={ROUTES.ACCOUNT.ORDERS}>Mes commandes</Link>
						</Button>
					</EmptyActions>
				</EmptyContent>
			</Empty>
		</div>
	);
}
