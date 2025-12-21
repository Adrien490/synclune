"use client";

import { Fab } from "@/shared/components/fab";
import { FAB_KEYS } from "@/shared/constants/fab";
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

interface AdminSpeedDialProps {
	/** Etat initial de visibilite (depuis le cookie serveur) */
	initialHidden?: boolean;
}

/**
 * FAB pour contacter Adrien dans l'admin dashboard
 */
export function AdminSpeedDial({ initialHidden = false }: AdminSpeedDialProps) {
	const [contactDialogOpen, setContactDialogOpen] = useState(false);

	return (
		<>
			<Fab
				fabKey={FAB_KEYS.CONTACT_ADRIEN}
				initialHidden={initialHidden}
				icon={<MessageSquare className="size-6" aria-hidden="true" />}
				tooltip={{
					title: "Contacter Adri",
					description: "Bug, feature ou question",
				}}
				ariaLabel="Ouvrir le formulaire de contact"
				showTooltip="Afficher le bouton contact"
				hideTooltip="Masquer le bouton contact"
				onClick={() => setContactDialogOpen(true)}
			/>

			<Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
				<DialogContent className="p-6 gap-4 sm:max-w-[525px]">
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
