"use client";

import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { revokeSession } from "@/modules/auth/actions/revoke-session";
import { Monitor, Smartphone, Globe, X, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useActionWithToast } from "@/shared/hooks/use-action-with-toast";
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

function RevokeSessionButton({ sessionId }: { sessionId: string }) {
	const { action, isPending } = useActionWithToast(revokeSession);

	return (
		<form action={action}>
			<input type="hidden" name="sessionId" value={sessionId} />
			<Button
				type="submit"
				variant="ghost"
				size="icon"
				className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
				disabled={isPending}
				title="Révoquer cette session"
			>
				{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
			</Button>
		</form>
	);
}

export function ActiveSessionsCard({ sessions }: ActiveSessionsCardProps) {
	const activeSessions = sessions.filter((s) => !s.isExpired);

	return (
		<section className="space-y-4">
			<div>
				<h2 className="flex items-center gap-2 text-base font-semibold">
					<Monitor className="text-muted-foreground size-4" />
					Appareils connectés
				</h2>
				<p className="text-muted-foreground mt-0.5 text-sm">
					{activeSessions.length} session{activeSessions.length > 1 ? "s" : ""} active
					{activeSessions.length > 1 ? "s" : ""}
				</p>
			</div>
			<div className="border-border/60 border-t pt-4">
				<div className="divide-border/50 divide-y">
					{activeSessions.map((session) => {
						const device = parseDevice(session.userAgent);
						const DeviceIcon = device.icon;
						const browser = parseBrowser(session.userAgent);

						return (
							<div key={session.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
								<DeviceIcon className="text-muted-foreground h-5 w-5 shrink-0" />
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<span className="truncate text-sm font-medium">
											{browser} — {device.label}
										</span>
										{session.isCurrentSession && (
											<Badge variant="secondary" className="shrink-0 text-xs">
												Actuel
											</Badge>
										)}
									</div>
									<div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
										{session.ipAddress && <span>{session.ipAddress}</span>}
										<span>
											{formatDistanceToNow(session.createdAt, {
												addSuffix: true,
												locale: fr,
											})}
										</span>
									</div>
								</div>
								{!session.isCurrentSession && <RevokeSessionButton sessionId={session.id} />}
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
