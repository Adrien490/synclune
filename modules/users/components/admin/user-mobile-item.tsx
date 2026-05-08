"use client";

import { CircleCheck } from "lucide-react";

import { LongPressMenuLink } from "@/shared/components/long-press-menu-link";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { formatDateShort } from "@/shared/utils/dates";

import { useUserActions } from "../../hooks/use-user-actions";

import { UserAdminDialogs } from "./user-admin-dialogs";

interface UserMobileItemProps {
	user: {
		id: string;
		name: string | null;
		email: string;
		role?: string;
		emailVerified: boolean;
		deletedAt: Date | null;
		suspendedAt?: Date | null;
		createdAt: Date;
		_count: { orders: number };
	};
}

export function UserMobileItem({ user }: UserMobileItemProps) {
	const displayName = user.name ?? "Utilisateur";
	const orderCount = user._count.orders;

	const { sections } = useUserActions({ user });

	return (
		<>
			<LongPressMenuLink
				href={`/admin/clients/${user.id}`}
				ariaLabel={`Client ${displayName}`}
				sections={sections}
				menuTitle="Actions utilisateur"
				menuDescription={displayName}
				className="text-left"
			>
				<Item
					variant="outline"
					size="sm"
					className={user.deletedAt ? "w-full gap-3 opacity-50" : "w-full gap-3"}
					aria-roledescription="carte client"
				>
					<ItemContent className="min-w-0">
						<ItemTitle className="w-full min-w-0">
							<span className="truncate font-semibold">{displayName}</span>
							{user.emailVerified ? (
								<CircleCheck
									className="h-4 w-4 shrink-0 text-green-600"
									aria-label="Email verifie"
								/>
							) : null}
						</ItemTitle>
						<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
							<span className="truncate">{user.email}</span>
						</ItemDescription>
						<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
							<span>
								{orderCount} commande{orderCount !== 1 ? "s" : ""}
							</span>
							<span>·</span>
							<span>{formatDateShort(user.createdAt)}</span>
						</ItemDescription>
					</ItemContent>
				</Item>
			</LongPressMenuLink>

			<UserAdminDialogs user={{ id: user.id, name: user.name, email: user.email }} />
		</>
	);
}
