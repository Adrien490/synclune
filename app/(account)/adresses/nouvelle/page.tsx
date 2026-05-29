import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { CreateAddressPageForm } from "@/modules/addresses/components/create-address-page-form";

export const metadata: Metadata = {
	title: "Ajouter une adresse",
};

export default function NewAddressPage() {
	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<div className="space-y-2">
				<Link
					href="/adresses"
					className="text-muted-foreground hover:text-foreground focus-ring -ml-1 inline-flex items-center gap-1 rounded-md text-sm"
				>
					<ChevronLeft className="size-4" aria-hidden="true" />
					Mes adresses
				</Link>
				<div>
					<h1 className="font-display text-2xl font-normal tracking-normal">Ajouter une adresse</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						Ajoutez une nouvelle adresse de livraison pour accélérer vos prochaines commandes.
					</p>
				</div>
			</div>

			<CreateAddressPageForm />
		</div>
	);
}
