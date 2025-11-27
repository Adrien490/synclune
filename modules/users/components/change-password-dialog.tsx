"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { ChangePasswordForm } from "./change-password-form";

interface ChangePasswordDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({
	open,
	onOpenChange,
}: ChangePasswordDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Changer le mot de passe</DialogTitle>
					<DialogDescription>
						Pour changer votre mot de passe, il faut qu&apos;il contienne au moins 8 caractères.
					</DialogDescription>
				</DialogHeader>
				<ChangePasswordForm onOpenChange={onOpenChange} />
			</DialogContent>
		</Dialog>
	);
}
