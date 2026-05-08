import Link from "next/link";
import { CircleCheck, Eye } from "lucide-react";

import { AdminDetailBackLink } from "@/shared/components/admin-detail-back-link";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { formatDateShort } from "@/shared/utils/dates";

import { UserActionsClient } from "./user-actions-client";
import { UserAdminDialogs } from "./user-admin-dialogs";

interface UserDetailPageProps {
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
	orderCount: number;
}

export function UserDetailPage({ user, orderCount }: UserDetailPageProps) {
	const displayName = user.name ?? user.email;
	const isAdmin = user.role === "ADMIN";
	const isDeleted = !!user.deletedAt;
	const isSuspended = !!user.suspendedAt;

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
			<AdminDetailBackLink href="/admin/clients" label="Retour aux clients" />
			<header className="space-y-2">
				<div className="space-y-1">
					<h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
						{displayName}
						{user.emailVerified ? (
							<CircleCheck className="size-5 shrink-0 text-green-600" aria-label="Email vérifié" />
						) : null}
					</h1>
					<p className="text-muted-foreground text-sm">{user.email}</p>
				</div>
			</header>

			<Separator />

			<section>
				<dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 text-sm">
					<dt className="text-muted-foreground">Email</dt>
					<dd className="flex items-center gap-1.5 truncate">
						<span className="truncate">{user.email}</span>
					</dd>
					<dt className="text-muted-foreground">Rôle</dt>
					<dd>
						<Badge variant={isAdmin ? "default" : "secondary"}>
							{isAdmin ? "Administrateur" : "Utilisateur"}
						</Badge>
					</dd>
					<dt className="text-muted-foreground">Statut</dt>
					<dd className="flex flex-wrap gap-1.5">
						{isDeleted ? (
							<Badge variant="outline">Supprimé</Badge>
						) : isSuspended ? (
							<Badge variant="outline">Suspendu</Badge>
						) : (
							<Badge variant="default">Actif</Badge>
						)}
					</dd>
					<dt className="text-muted-foreground">Commandes</dt>
					<dd>{orderCount}</dd>
					<dt className="text-muted-foreground">Inscription</dt>
					<dd>{formatDateShort(user.createdAt)}</dd>
				</dl>
			</section>

			<Separator />

			<section className="flex flex-col gap-2">
				<h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
					Navigation
				</h2>
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link href={`/admin/ventes/commandes?userId=${user.id}`}>
						<Eye className="size-4" aria-hidden="true" />
						Voir les commandes
					</Link>
				</Button>
			</section>

			<Separator />

			<UserActionsClient
				user={{
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role,
					deletedAt: user.deletedAt,
					suspendedAt: user.suspendedAt,
				}}
			/>

			<UserAdminDialogs user={{ id: user.id, name: user.name, email: user.email }} />
		</div>
	);
}
