"use client";

import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { CircleCheck, Ellipsis } from "lucide-react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

import { useUserActions } from "../../hooks/use-user-actions";
import { useSetAdminPageTitle } from "@/app/admin/_components/admin-page-title-context";
import { DetailStickyActionBar } from "@/shared/components/admin/detail-sticky-action-bar";
import { DetailHeaderShell } from "@/shared/components/admin/detail-header-shell";

interface UserDetailHeaderProps {
	user: {
		id: string;
		name: string | null;
		email: string;
		role: string;
		emailVerified: boolean;
		deletedAt: Date | null;
		suspendedAt: Date | null;
		createdAt: Date;
	};
}

export function UserDetailHeader({ user }: UserDetailHeaderProps) {
	const { sections } = useUserActions({
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			deletedAt: user.deletedAt,
			suspendedAt: user.suspendedAt,
		},
	});

	const displayName = user.name ?? user.email;
	// Titre lisible pour le header mobile (sinon : id opaque Title-Casé).
	useSetAdminPageTitle(displayName);
	const isAdmin = user.role === "ADMIN";
	const isDeleted = !!user.deletedAt;
	const isSuspended = !!user.suspendedAt;
	const statusLabel = isDeleted ? "Supprimé" : isSuspended ? "Suspendu" : "Actif";
	const statusVariant: "default" | "secondary" | "outline" = isDeleted
		? "outline"
		: isSuspended
			? "outline"
			: "default";

	return (
		<DetailHeaderShell>
			<div className="min-w-0">
				<h1 className="font-display text-foreground flex items-center gap-2 text-xl leading-tight font-normal tracking-normal sm:text-3xl lg:text-4xl">
					<span className="truncate" style={{ viewTransitionName: `user-name-${user.id}` }}>
						{displayName}
					</span>
					{user.emailVerified ? (
						<CircleCheck className="size-5 shrink-0 text-green-600" aria-label="Email vérifié" />
					) : null}
				</h1>
				<div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs md:hidden">
					<Badge variant={isAdmin ? "default" : "secondary"} className="shrink-0">
						{isAdmin ? "Admin" : "Utilisateur"}
					</Badge>
					<Badge variant={statusVariant} className="shrink-0">
						{statusLabel}
					</Badge>
					<span aria-hidden="true">·</span>
					<span className="truncate">
						Inscrit {formatDistanceToNow(user.createdAt, { addSuffix: true, locale: fr })}
					</span>
				</div>
				<p className="text-muted-foreground mt-1 hidden text-sm md:block">
					Inscrit le {format(user.createdAt, "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
				</p>
			</div>

			<DetailStickyActionBar>
				<ResponsiveActionMenu>
					<ResponsiveActionMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							aria-label="Plus d'actions"
							className="min-h-11 w-full touch-manipulation sm:min-h-9 md:w-auto"
						>
							<Ellipsis className="size-4" aria-hidden="true" />
							<span className="md:hidden">Actions</span>
						</Button>
					</ResponsiveActionMenuTrigger>
					<ResponsiveActionMenuContent
						title="Actions client"
						description={displayName}
						sections={sections}
					/>
				</ResponsiveActionMenu>
			</DetailStickyActionBar>
		</DetailHeaderShell>
	);
}
