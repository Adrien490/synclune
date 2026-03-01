import { Button } from "@/shared/components/ui/button";
import Link from "next/link";

export default function EspaceClientNotFound() {
	return (
		<div className="space-y-6 py-12 text-center">
			<div className="space-y-3">
				<p className="text-6xl" aria-hidden="true">
					🔍
				</p>
				<h1 className="font-display text-foreground text-2xl font-semibold">Page introuvable</h1>
				<p className="text-muted-foreground mx-auto max-w-md">
					L'élément que vous recherchez n'existe pas ou a été supprimé.
				</p>
			</div>

			<div className="flex flex-col justify-center gap-3 sm:flex-row">
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
