"use client";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
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
		<ResponsiveDialog open={open} onOpenChange={onOpenChange}>
			<ResponsiveDialogContent className="sm:max-w-[500px]">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>Changer le mot de passe</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Pour changer votre mot de passe, il faut qu&apos;il contienne au moins 6 caractères.
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				<ChangePasswordForm onOpenChange={onOpenChange} />
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
