"use client";

import { type RefundReason } from "@/app/generated/prisma/browser";
import { REFUND_REASON_LABELS } from "@/modules/refunds/constants/refund.constants";
import {
	FORM_SECTION_CARD_CLASS,
	FORM_SECTION_TITLE_CLASS as MOBILE_SECTION_TITLE,
} from "@/shared/components/forms/form-section-styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";

import type { CreateRefundFormInstance } from "./create-refund-form-types";

interface RefundSidebarCardsProps {
	form: CreateRefundFormInstance;
	isPending: boolean;
	restockByDefault: boolean;
	onReasonChange: (value: RefundReason) => void;
	selectedCount: number;
	totalAmount: number;
	alreadyRefunded: number;
	maxRefundable: number;
}

const REASON_OPTIONS = (Object.entries(REFUND_REASON_LABELS) as [RefundReason, string][]).map(
	([value, label]) => ({ value, label }),
);

/**
 * Colonne latérale du formulaire de remboursement : Motif (SelectField),
 * Note (TextareaField) et Récapitulatif. Aligne le traitement visuel sur les
 * sidebar-cards du formulaire produit (`FORM_SECTION_CARD_CLASS`).
 */
export function RefundSidebarCards({
	form,
	isPending,
	restockByDefault,
	onReasonChange,
	selectedCount,
	totalAmount,
	alreadyRefunded,
	maxRefundable,
}: RefundSidebarCardsProps) {
	const exceedsMax = totalAmount > maxRefundable;

	return (
		<div className="space-y-6">
			{/* Motif */}
			<Card
				role="region"
				aria-label="Motif du remboursement"
				className={FORM_SECTION_CARD_CLASS}
				style={{ viewTransitionName: "refund-reason-card" }}
			>
				<CardContent className="space-y-4 px-0 pt-6 sm:px-0 lg:px-6">
					<form.AppField
						name="reason"
						listeners={{ onChange: ({ value }) => onReasonChange(value as RefundReason) }}
					>
						{(field) => (
							<field.SelectField
								label="Motif du remboursement"
								options={REASON_OPTIONS}
								disabled={isPending}
							/>
						)}
					</form.AppField>

					<div className="flex justify-end">
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									aria-label="En savoir plus sur le restockage par motif"
									className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
								>
									Restockage ?
								</button>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="max-w-xs">
								Le motif détermine si le stock est restauré par défaut. Tu peux ajuster manuellement
								sur chaque bijou.
							</TooltipContent>
						</Tooltip>
					</div>

					<div
						className={cn(
							"rounded p-2 text-xs",
							restockByDefault
								? "bg-success/10 text-success"
								: "bg-warning/15 text-warning-foreground",
						)}
					>
						{restockByDefault
							? "Stock restauré par défaut (bijou récupéré)."
							: "Stock non restauré par défaut (bijou perdu ou cassé)."}
					</div>
				</CardContent>
			</Card>

			{/* Note */}
			<Card role="region" aria-label="Note" className={FORM_SECTION_CARD_CLASS}>
				<CardContent className="px-0 pt-6 sm:px-0 lg:px-6">
					<form.AppField name="note">
						{(field) => (
							<field.TextareaField
								label="Note"
								optional
								placeholder="Détails supplémentaires…"
								rows={3}
								maxLength={2000}
								showCounter
								disabled={isPending}
								enterKeyHint="done"
								autoCapitalize="sentences"
								spellCheck
								className="resize-none"
							/>
						)}
					</form.AppField>
				</CardContent>
			</Card>

			{/* Récapitulatif */}
			<Card
				role="region"
				aria-label="Récapitulatif"
				className={FORM_SECTION_CARD_CLASS}
				style={{ viewTransitionName: "refund-summary-card" }}
			>
				<CardHeader className="px-0 sm:px-0 lg:px-6">
					<CardTitle className={MOBILE_SECTION_TITLE}>Récapitulatif</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 px-0 sm:px-0 lg:px-6">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Bijoux sélectionnés</span>
						<span className="tabular-nums">{selectedCount}</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Montant du remboursement</span>
						<span
							className={cn(
								"font-medium tabular-nums motion-safe:transition-colors",
								exceedsMax && "text-destructive",
							)}
							aria-live="polite"
						>
							{formatEuro(totalAmount)}
						</span>
					</div>
					<Separator />
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Déjà remboursé</span>
						<span className="tabular-nums">{formatEuro(alreadyRefunded)}</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Max remboursable</span>
						<span className="tabular-nums">{formatEuro(maxRefundable)}</span>
					</div>
					{exceedsMax && (
						<p className="text-destructive text-xs">Le montant dépasse le maximum remboursable.</p>
					)}
				</CardContent>
			</Card>

			<p className="text-muted-foreground text-center text-xs">
				On préviendra l&apos;atelier et le client : remboursement traité sous 48h.
			</p>
		</div>
	);
}
