"use client";

import { EllipsisVertical } from "lucide-react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";

import { useUserActions } from "../../hooks/use-user-actions";

import { UserAdminDialogs } from "./user-admin-dialogs";

interface UsersRowActionsProps {
	user: {
		id: string;
		name: string;
		email: string;
		role?: string;
		deletedAt: Date | null;
		suspendedAt?: Date | null;
	};
}

export function UsersRowActions({ user }: UsersRowActionsProps) {
	const displayName = user.name || user.email;
	const { sections } = useUserActions({ user });

	return (
		<>
			<ResponsiveActionMenu>
				<ResponsiveActionMenuTrigger asChild>
					<Button
						variant="ghost"
						className="h-11 w-11 p-0 transition-transform active:scale-95"
						aria-label="Actions"
					>
						<EllipsisVertical className="h-4 w-4" />
					</Button>
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent
					title="Actions utilisateur"
					description={displayName}
					sections={sections}
				/>
			</ResponsiveActionMenu>

			<UserAdminDialogs user={{ id: user.id, name: user.name, email: user.email }} />
		</>
	);
}
