"use client";

import Image from "next/image";
import { User } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import type { AdminQuickSearchAdapter } from "@/shared/components/sticky-action-bar";

import { quickSearchUsersAdminAction } from "../../actions/quick-search-users-admin";
import type { AdminQuickSearchUserItem } from "../../data/quick-search-users-admin";

export const usersAdminQuickSearchAdapter: AdminQuickSearchAdapter<AdminQuickSearchUserItem> = {
	scope: "users",
	placeholder: "Nom, email…",
	ariaLabel: "Rechercher un client par nom ou email",
	minQueryLength: 2,
	search: (query) => quickSearchUsersAdminAction(query),
	getResultId: (u) => `admin-user-${u.id}`,
	// Pas de page détail dédiée — filtrer la liste sur l'email pour ouvrir le drawer ensuite.
	getResultHref: (u) => `/admin/clients?search=${encodeURIComponent(u.email)}`,
	getResultLabel: (u) => u.name ?? u.email,
	renderResultItem: (u) => <UserCard user={u} />,
};

function UserCard({ user }: { user: AdminQuickSearchUserItem }) {
	return (
		<>
			<div className="bg-muted flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full">
				{user.image ? (
					<Image
						src={user.image}
						alt={user.name ?? user.email}
						width={48}
						height={48}
						sizes="48px"
						className="size-full object-cover"
						unoptimized
					/>
				) : (
					<User className="text-muted-foreground size-5" aria-hidden="true" />
				)}
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{user.name ?? "Sans nom"}</p>
				<p className="text-muted-foreground truncate text-xs">{user.email}</p>
			</div>
			{user.role === "ADMIN" && (
				<Badge variant="secondary" className="text-[10px]">
					Admin
				</Badge>
			)}
		</>
	);
}
