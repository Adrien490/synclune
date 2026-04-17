"use client";

import { type ReactNode } from "react";

import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/shared/components/ui/drawer";

interface AdminItemDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
}

/**
 * Drawer mobile natif pour ouvrir la fiche d'un item administrable.
 *
 * Pur composant visuel controllé : l'état d'ouverture vient du store
 * de dialogs (pattern utilisé pour les autres modales du projet).
 * Mounter une seule fois au niveau de la page (cf. DeleteColorAlertDialog).
 */
export function AdminItemDrawer({
	open,
	onOpenChange,
	title,
	description,
	children,
	footer,
}: AdminItemDrawerProps) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>{title}</DrawerTitle>
					{description ? <DrawerDescription>{description}</DrawerDescription> : null}
				</DrawerHeader>
				<DrawerBody className="space-y-5">{children}</DrawerBody>
				{footer ? <DrawerFooter>{footer}</DrawerFooter> : null}
			</DrawerContent>
		</Drawer>
	);
}
