/**
 * Tâches de maintenance manuelles — Lot 1 SIMPLIFICATION.md (2026-08-03).
 *
 * Ex-crons convertis en boutons sur `/admin/configuration/maintenance` : leur
 * service est inchangé, seul le déclencheur passe du planning Vercel à un clic
 * de Léane. La SSOT des ids sert à la fois le schéma Zod de l'action
 * (`run-maintenance-task`) et le rendu de la page.
 *
 * (Le bouton transitoire `retry-post-webhook-tasks` est parti au Lot 2 avec la
 * file PostWebhookTask — les emails post-paiement s'envoient en direct, cf.
 * `execute-post-webhook-tasks.service.ts`.)
 */
export const MAINTENANCE_TASK_IDS = [
	"retry-webhooks",
	"reconcile-refunds",
	"sync-async-payments",
	"cleanup-orphan-media",
] as const;

export type MaintenanceTaskId = (typeof MAINTENANCE_TASK_IDS)[number];

export const MAINTENANCE_TASKS_META: ReadonlyArray<{
	id: MaintenanceTaskId;
	title: string;
	description: string;
}> = [
	{
		id: "retry-webhooks",
		title: "Rejouer les webhooks Stripe",
		description:
			"Rejoue les événements Stripe en échec. Stripe retente déjà de son côté pendant 3 jours — ce bouton rattrape le reliquat.",
	},
	{
		id: "reconcile-refunds",
		title: "Réconcilier les remboursements",
		description:
			"Finalise les remboursements restés en attente et rattrape les avoirs ou emails manqués. Le cas nominal passe par le webhook Stripe.",
	},
	{
		id: "sync-async-payments",
		title: "Synchroniser les paiements asynchrones",
		description:
			"Rapproche les paiements restés en attente côté Stripe (virements, méthodes différées).",
	},
	{
		id: "cleanup-orphan-media",
		title: "Purger les médias orphelins",
		description:
			"Supprime les fichiers UploadThing qui ne sont plus référencés par aucun produit. Le scan reprend là où il s'était arrêté.",
	},
];
