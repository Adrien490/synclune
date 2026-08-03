"use client";

import { useActionState } from "react";
import { Wrench } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import {
	MAINTENANCE_TASKS_META,
	type MaintenanceTaskId,
} from "@/modules/cron/constants/maintenance-tasks";
import { runMaintenanceTask } from "@/modules/cron/actions/run-maintenance-task";

function MaintenanceTaskRow({
	id,
	title,
	description,
}: {
	id: MaintenanceTaskId;
	title: string;
	description: string;
}) {
	const [, formAction, isPending] = useActionState(
		withCallbacks(runMaintenanceTask, createToastCallbacks({ loadingMessage: `${title}…` })),
		undefined,
	);

	return (
		<li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
			<div className="space-y-1">
				<h3 className="font-medium">{title}</h3>
				<p className="text-muted-foreground text-sm">{description}</p>
			</div>
			<form action={formAction} className="shrink-0">
				<input type="hidden" name="task" value={id} />
				<Button type="submit" variant="outline" className="min-h-11" disabled={isPending}>
					{isPending ? <Spinner className="size-4" /> : null}
					Lancer
				</Button>
			</form>
		</li>
	);
}

/**
 * Tâches de rattrapage à lancer à la main — ex-crons du Lot 1 (SIMPLIFICATION.md).
 * L'essentiel tourne toujours tout seul (factures, RGPD, hygiène quotidienne) ;
 * ces passes-là sont des filets qu'on tire de temps en temps.
 */
export function MaintenanceTasksCard() {
	return (
		<section
			aria-labelledby="maintenance-tasks-heading"
			className="border-border bg-card rounded-xl border p-6"
		>
			<div className="flex items-start gap-3">
				<div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full">
					<Wrench className="text-muted-foreground size-5" aria-hidden="true" />
				</div>
				<div className="space-y-1">
					<h2 id="maintenance-tasks-heading" className="font-medium">
						Tâches de rattrapage
					</h2>
					<p className="text-muted-foreground text-sm">
						Chaque tâche est idempotente : la relancer ne refait pas ce qui a déjà été fait. En cas
						d&apos;erreur, le détail part automatiquement dans Sentry.
					</p>
				</div>
			</div>

			<ul className="divide-border mt-4 divide-y">
				{MAINTENANCE_TASKS_META.map((task) => (
					<MaintenanceTaskRow key={task.id} {...task} />
				))}
			</ul>
		</section>
	);
}
