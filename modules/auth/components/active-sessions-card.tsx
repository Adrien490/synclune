"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { revokeSession } from "@/modules/auth/actions/revoke-session";
import { Monitor, Smartphone, Globe, X, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { ActionStatus } from "@/shared/types/server-action";
import type { UserSession } from "../types/session.types";

interface ActiveSessionsCardProps {
	sessions: UserSession[];
}

function parseDevice(userAgent: string | null): {
	icon: typeof Monitor;
	label: string;
} {
	if (!userAgent) return { icon: Globe, label: "Appareil inconnu" };
	const ua = userAgent.toLowerCase();
	if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
		return { icon: Smartphone, label: "Mobile" };
	}
	return { icon: Monitor, label: "Ordinateur" };
}

function parseBrowser(userAgent: string | null): string {
	if (!userAgent) return "Navigateur inconnu";
	if (userAgent.includes("Firefox")) return "Firefox";
	if (userAgent.includes("Edg")) return "Edge";
	if (userAgent.includes("Chrome")) return "Chrome";
	if (userAgent.includes("Safari")) return "Safari";
	return "Navigateur";
}

export function ActiveSessionsCard({ sessions }: ActiveSessionsCardProps) {
	const [state, action, isPending] = useActionState(revokeSession, undefined);

	useEffect(() => {
		if (state?.status === ActionStatus.SUCCESS && state.message) {
			toast.success(state.message);
		} else if (state?.status && state.status !== ActionStatus.SUCCESS && state.message) {
			toast.error(state.message);
		}
	}, [state]);

	const activeSessions = sessions.filter((s) => !s.isExpired);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Monitor className="w-5 h-5" />
					Appareils connectés
				</CardTitle>
				<CardDescription>
					{activeSessions.length} session{activeSessions.length > 1 ? "s" : ""} active{activeSessions.length > 1 ? "s" : ""}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{activeSessions.map((session) => {
						const device = parseDevice(session.userAgent);
						const DeviceIcon = device.icon;
						const browser = parseBrowser(session.userAgent);

						return (
							<div
								key={session.id}
								className="flex items-center gap-3 p-3 rounded-lg border bg-card"
							>
								<DeviceIcon className="h-5 w-5 text-muted-foreground shrink-0" />
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<span className="text-sm font-medium truncate">
											{browser} — {device.label}
										</span>
										{session.isCurrentSession && (
											<Badge variant="secondary" className="text-xs shrink-0">
												Actuel
											</Badge>
										)}
									</div>
									<div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
										{session.ipAddress && (
											<span>{session.ipAddress}</span>
										)}
										<span>
											{formatDistanceToNow(session.createdAt, {
												addSuffix: true,
												locale: fr,
											})}
										</span>
									</div>
								</div>
								{!session.isCurrentSession && (
									<form action={action}>
										<input
											type="hidden"
											name="sessionId"
											value={session.id}
										/>
										<Button
											type="submit"
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
											disabled={isPending}
											title="Révoquer cette session"
										>
											{isPending ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<X className="h-4 w-4" />
											)}
										</Button>
									</form>
								)}
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
