import { Info } from "lucide-react";
import Link from "next/link";
import { Eye } from "lucide-react";

import { CopyButton } from "@/shared/components/copy-button";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

import type { AdminUserActiveSession } from "../../data/get-user-detail-admin";

import { UserActiveSessionsSection } from "./user-active-sessions-section";
import { UserAdminDialogs } from "./user-admin-dialogs";
import { UserDetailHeader } from "./user-detail-header";

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
	activeSessions: AdminUserActiveSession[];
}

export function UserDetailPage({ user, orderCount, activeSessions }: UserDetailPageProps) {
	const isAdmin = user.role === "ADMIN";
	const isDeleted = !!user.deletedAt;
	const isSuspended = !!user.suspendedAt;

	return (
		<div className="space-y-6">
			<UserDetailHeader user={user} />

			<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
				<div className="space-y-6 lg:col-span-2">
					<Card style={{ viewTransitionName: "user-detail-info" }}>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Info className="size-5" aria-hidden="true" />
								Informations
							</CardTitle>
						</CardHeader>
						<CardContent>
							<dl className="grid gap-3 text-sm">
								<div className="flex items-start justify-between gap-3">
									<dt className="text-muted-foreground shrink-0 pt-1.5">Email</dt>
									<dd className="flex min-w-0 items-start gap-1">
										<span className="text-foreground/80 pt-1.5 text-xs break-all">
											{user.email}
										</span>
										<CopyButton
											text={user.email}
											label="Email"
											className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
										/>
									</dd>
								</div>
								<div className="flex items-center justify-between gap-3">
									<dt className="text-muted-foreground">Rôle</dt>
									<dd>
										<Badge variant={isAdmin ? "default" : "secondary"}>
											{isAdmin ? "Administrateur" : "Utilisateur"}
										</Badge>
									</dd>
								</div>
								<div className="flex items-center justify-between gap-3">
									<dt className="text-muted-foreground">Statut</dt>
									<dd>
										{isDeleted ? (
											<Badge variant="outline">Supprimé</Badge>
										) : isSuspended ? (
											<Badge variant="outline">Suspendu</Badge>
										) : (
											<Badge variant="default">Actif</Badge>
										)}
									</dd>
								</div>
								<div className="flex items-center justify-between gap-3">
									<dt className="text-muted-foreground">Commandes</dt>
									<dd className="font-medium">{orderCount}</dd>
								</div>
							</dl>
						</CardContent>
					</Card>

					<UserActiveSessionsSection sessions={activeSessions} />
				</div>

				<div className="space-y-6">
					<Card style={{ viewTransitionName: "user-detail-orders" }}>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Eye className="size-5" aria-hidden="true" />
								Navigation
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Button asChild variant="outline" className="h-11 w-full justify-start gap-3">
								<Link href={`/admin/ventes/commandes?userId=${user.id}`}>
									<Eye className="size-4" aria-hidden="true" />
									Voir les commandes
								</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>

			<UserAdminDialogs user={{ id: user.id, name: user.name, email: user.email }} />
		</div>
	);
}
