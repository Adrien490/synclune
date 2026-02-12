"use client";

import { FAB_KEYS } from "@/shared/constants/fab";
import { Fab } from "@/shared/components/fab";
import { MessageSquare } from "lucide-react";

interface ContactFabProps {
	email: string;
	initialHidden: boolean;
}

export function ContactFab({ email, initialHidden }: ContactFabProps) {
	return (
		<Fab
			fabKey={FAB_KEYS.STOREFRONT}
			initialHidden={initialHidden}
			hideOnMobile={false}
			icon={<MessageSquare className="size-6" />}
			tooltip={{
				title: "Contacter Adrien",
				description: "Question ou suggestion",
			}}
			ariaLabel="Envoyer un email a Adrien"
			href={`mailto:${email}`}
			containerClassName="bottom-[calc(var(--bottom-bar-height,0px)+max(1rem,env(safe-area-inset-bottom))+3.25rem)] md:bottom-[calc(max(1.5rem,env(safe-area-inset-bottom))+3.25rem)]"
		/>
	);
}
