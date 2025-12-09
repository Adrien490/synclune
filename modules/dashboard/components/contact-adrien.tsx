"use client";

import { Fab, FAB_KEYS } from "@/shared/features/fab";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { ContactAdrienForm } from "./contact-adrien-form";

interface ContactAdrienProps {
	/** Etat initial de visibilité (depuis le cookie serveur) */
	initialHidden?: boolean;
}

/**
 * FAB pour contacter Adri (Desktop uniquement)
 */
export function ContactAdrien({ initialHidden = false }: ContactAdrienProps) {
	const [dialogOpen, setDialogOpen] = useState(false);

	return (
		<>
			<Fab
				fabKey={FAB_KEYS.CONTACT_ADRIEN}
				initialHidden={initialHidden}
				icon={<MessageSquare className="h-6 w-6" aria-hidden="true" />}
				tooltip={{
					title: "Contacter Adri",
					description: "Tu peux me contacter ici Lélé 😁",
				}}
				ariaLabel="Contacter Adri - Envoyer un message ou signaler un problème"
				ariaDescription="Ouvre un formulaire pour envoyer un message à Adri, poser une question, faire une suggestion ou signaler un problème."
				showTooltip="Afficher Contacter Adri"
				hideTooltip="Masquer Contacter Adri"
				onClick={() => setDialogOpen(true)}
			/>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-[525px]">
					<DialogHeader>
						<DialogTitle>Contacter Adri</DialogTitle>
						<DialogDescription>
							Signale un bug, demande une nouvelle fonctionnalité ou pose une
							question.
						</DialogDescription>
					</DialogHeader>
					<ContactAdrienForm
						onSuccess={() => setDialogOpen(false)}
						onCancel={() => setDialogOpen(false)}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
}
