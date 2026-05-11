import { Monitor } from "lucide-react";

import { formatRelativeTime } from "@/shared/utils/dates";

import type { AdminUserActiveSession } from "../../data/get-user-detail-admin";

interface UserActiveSessionsSectionProps {
	sessions: AdminUserActiveSession[];
}

/**
 * Affiche les sessions actives d'un utilisateur (page admin).
 * Source: `getUserDetailAdmin` — sessions avec `expiresAt > now`.
 *
 * Les sessions peuvent être révoquées en bloc via le menu Actions
 * (`invalidateUserSessions`).
 */
export function UserActiveSessionsSection({ sessions }: UserActiveSessionsSectionProps) {
	if (sessions.length === 0) {
		return (
			<section aria-label="Sessions actives" className="flex flex-col gap-2">
				<h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
					Sessions actives
				</h2>
				<p className="text-muted-foreground text-sm">Aucune session active.</p>
			</section>
		);
	}

	return (
		<section aria-label="Sessions actives" className="flex flex-col gap-2">
			<h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
				Sessions actives ({sessions.length})
			</h2>
			<ul className="flex flex-col gap-2">
				{sessions.map((session) => (
					<li
						key={session.id}
						className="bg-muted/30 flex items-start gap-3 rounded-md border px-3 py-2 text-sm"
					>
						<Monitor className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
						<div className="min-w-0 flex-1 space-y-1">
							<p className="font-mono text-xs break-words">
								{session.userAgent ?? "Agent inconnu"}
							</p>
							<p className="text-muted-foreground text-xs">
								<span className="font-mono">{session.ipAddress ?? "IP inconnue"}</span>
								<span className="mx-1.5" aria-hidden="true">
									·
								</span>
								<time dateTime={session.createdAt.toISOString()}>
									Ouverte {formatRelativeTime(session.createdAt)}
								</time>
							</p>
						</div>
					</li>
				))}
			</ul>
		</section>
	);
}
