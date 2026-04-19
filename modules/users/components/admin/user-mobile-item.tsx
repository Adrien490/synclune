"use client";

import { CircleCheck } from "lucide-react";

import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { formatDateShort } from "@/shared/utils/dates";

import { USER_ITEM_DRAWER_ID, type UserItemDrawerData } from "./user-item-drawer";

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
	const { open } = useDialog<UserItemDrawerData>(USER_ITEM_DRAWER_ID);
	const displayName = user.name ?? "Utilisateur";
	const orderCount = user._count.orders;

	const handleOpen = () => {
		open({
			user: {
				id: user.id,
				name: displayName,
				email: user.email,
				role: user.role,
				emailVerified: user.emailVerified,
				deletedAt: user.deletedAt,
				suspendedAt: user.suspendedAt ?? null,
				orderCount,
				createdAt: user.createdAt,
			},
		});
	};

	return (
		<button
			type="button"
			aria-label={`Client ${displayName}`}
			onClick={handleOpen}
			className="focus-visible:ring-primary w-full rounded-lg text-left focus-visible:ring-2 focus-visible:outline-none"
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
							<CircleCheck className="h-4 w-4 shrink-0 text-green-600" aria-label="Email verifie" />
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
		</button>
	);
}
