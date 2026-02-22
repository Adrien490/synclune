import { Button } from "@/shared/components/ui/button";
import Link from "next/link";

export default function EspaceClientNotFound() {
	return (
		<div className="text-center space-y-6 py-12">
			<div className="space-y-3">
				<p className="text-6xl" aria-hidden="true">
					🔍
				</p>
				<h1 className="text-2xl font-display font-semibold text-foreground">
					Page introuvable
				</h1>
				<p className="text-muted-foreground max-w-md mx-auto">
					L'élément que vous recherchez n'existe pas ou a été supprimé.
				</p>
			</div>

			<div className="flex flex-col sm:flex-row gap-3 justify-center">
				<Button asChild>
					<Link href="/compte">Retour au tableau de bord</Link>
				</Button>
				<Button asChild variant="secondary">
					<Link href="/commandes">Voir mes commandes</Link>
				</Button>
			</div>
		</div>
	);
}
