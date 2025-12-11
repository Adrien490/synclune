"use client";

import { SpeedDialFab, FAB_KEYS } from "@/shared/features/fab";
import type { SpeedDialAction } from "@/shared/features/fab/components/speed-dial-fab";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { MessageSquare, PackagePlus } from "lucide-react";
import { useState } from "react";
import { ContactAdrienForm } from "./contact-adrien-form";

interface AdminSpeedDialProps {
	/** Etat initial de visibilite (depuis le cookie serveur) */
	initialHidden?: boolean;
}

/**
 * Speed Dial FAB pour l'admin dashboard
 * Actions rapides : Creer un produit, Alertes stock, Contacter Adrien
 */
export function AdminSpeedDial({ initialHidden = false }: AdminSpeedDialProps) {
	const [contactDialogOpen, setContactDialogOpen] = useState(false);

	const actions: SpeedDialAction[] = [
		{
			id: "create-product",
			icon: <PackagePlus className="size-5" aria-hidden="true" />,
			label: "Creer un produit",
			href: "/admin/catalogue/produits/nouveau",
		},
		{
			id: "contact-adrien",
			icon: <MessageSquare className="size-5" aria-hidden="true" />,
			label: "Contacter Adri",
			onClick: () => setContactDialogOpen(true),
			variant: "secondary",
		},
	];

	return (
		<>
			<SpeedDialFab
				fabKey={FAB_KEYS.ADMIN_SPEED_DIAL}
				initialHidden={initialHidden}
				tooltip={{
					title: "Actions rapides",
					description: "Acces rapide aux actions frequentes",
				}}
				ariaLabel="Ouvrir le menu d'actions rapides"
				ariaDescription="Menu avec acces rapide a : creer un produit, contacter Adrien"
				showTooltip="Afficher les actions rapides"
				hideTooltip="Masquer les actions rapides"
				actions={actions}
			/>

			<Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
				<DialogContent className="sm:max-w-[525px]">
					<DialogHeader>
						<DialogTitle>Contacter Adri</DialogTitle>
						<DialogDescription>
							Signale un bug, demande une nouvelle fonctionnalite ou pose une
							question.
						</DialogDescription>
					</DialogHeader>
					<ContactAdrienForm
						onSuccess={() => setContactDialogOpen(false)}
						onCancel={() => setContactDialogOpen(false)}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
}
