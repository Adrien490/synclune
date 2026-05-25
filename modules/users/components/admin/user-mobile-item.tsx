"use client";

import { CircleCheck, Loader2, Shield } from "lucide-react";

import { MobileSelectableCard } from "@/shared/components/mobile-selection";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@/shared/components/ui/item";
import { ADMIN_PENDING_LABELS } from "@/shared/constants/admin-pending-labels";
import { useAdminListPendingContextOptional } from "@/shared/contexts/admin-list-pending-context";
import { cn } from "@/shared/utils/cn";
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

function getInitials(name: string | null, email: string): string {
	const trimmed = name?.trim();
	const source = trimmed && trimmed.length > 0 ? trimmed : email;
	const parts = source.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
	}
	return source.slice(0, 2).toUpperCase();
}

export function UserMobileItem({ user }: UserMobileItemProps) {
	const displayName = user.name ?? "Utilisateur";
	const initials = getInitials(user.name, user.email);
	const orderCount = user._count.orders;
	const pendingCtx = useAdminListPendingContextOptional();
	const isPendingItem = pendingCtx?.isPending(user.id) ?? false;
	const pendingKind = pendingCtx?.pendingKind ?? null;
	const pendingLabel = isPendingItem ? ADMIN_PENDING_LABELS[pendingKind ?? "status"] : null;
	const isAdmin = user.role === "ADMIN";

	const { sections } = useUserActions({ user });

	return (
		<>
			<MobileSelectableCard
				id={user.id}
				itemLabel={`Client ${displayName}, ${user.email}${isAdmin ? ", admin" : ""}${user.deletedAt ? ", supprimé" : user.suspendedAt ? ", suspendu" : ""}, ${orderCount} commande${orderCount !== 1 ? "s" : ""}`}
				longPressProps={{
					href: `/admin/clients/${user.id}`,
					ariaLabel: `Client ${displayName}`,
					sections,
					menuTitle: "Actions utilisateur",
					menuDescription: displayName,
					className: "text-left",
					viewTransitionName: `user-card-${user.id}`,
				}}
			>
				<Item
					variant="outline"
					size="sm"
					className={cn(
						"w-full gap-3 motion-safe:transition-opacity",
						user.deletedAt && "opacity-50",
						isPendingItem && "opacity-60",
					)}
					aria-roledescription="carte client"
					aria-busy={isPendingItem || undefined}
				>
					<ItemMedia variant="icon">
						<Avatar
							className="bg-primary/10 text-primary size-8"
							style={{ viewTransitionName: `user-avatar-${user.id}` }}
						>
							<AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
								{initials}
							</AvatarFallback>
						</Avatar>
					</ItemMedia>
					<ItemContent className="min-w-0">
						<ItemTitle className="w-full min-w-0">
							<span
								className="truncate font-semibold"
								style={{ viewTransitionName: `user-name-${user.id}` }}
							>
								{displayName}
							</span>
							{user.emailVerified ? (
								<CircleCheck
									className="size-4 shrink-0 text-green-600"
									aria-label="Email vérifié"
								/>
							) : null}
							{isPendingItem ? (
								<Badge variant="secondary" style={{ viewTransitionName: `user-status-${user.id}` }}>
									<Loader2 className="size-3 motion-safe:animate-spin" aria-hidden="true" />
									{pendingLabel}
								</Badge>
							) : isAdmin ? (
								<Badge
									variant="default"
									className="gap-1"
									style={{ viewTransitionName: `user-status-${user.id}` }}
								>
									<Shield className="size-3" aria-hidden="true" />
									Admin
								</Badge>
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
			</MobileSelectableCard>

			<UserAdminDialogs user={{ id: user.id, name: user.name, email: user.email }} />
		</>
	);
}
