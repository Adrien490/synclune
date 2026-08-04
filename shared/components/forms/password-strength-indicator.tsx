"use client";

import { cn } from "@/shared/utils/cn";
import { CheckIcon, XIcon } from "@phosphor-icons/react/ssr";
import {
	PASSWORD_RULES,
	getStrengthLevel,
	getStrengthLabel,
	getStrengthColor,
} from "@/shared/utils/password-strength";

interface PasswordStrengthIndicatorProps {
	password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
	const strengthLevel = getStrengthLevel(password);
	const strengthLabel = getStrengthLabel(strengthLevel);
	const strengthColor = getStrengthColor(strengthLevel);

	if (!password) return null;

	return (
		/*
		 * Pas d'`aria-live` sur ce conteneur : il enveloppait la barre ET la liste
		 * des 4 critères, et le composant est piloté par la valeur brute du champ —
		 * chaque frappe reconstruisait donc l'annonce complète, soit un flot continu
		 * de parole pendant la saisie d'un mot de passe. Seul le libellé de force
		 * (ci-dessous) est annoncé, et uniquement quand le niveau change.
		 */
		<div className="space-y-3">
			{/* Barre de progression */}
			<div className="space-y-1.5">
				<div className="flex justify-between text-xs">
					<span className="text-muted-foreground">Force du mot de passe</span>
					<span
						aria-live="polite"
						aria-atomic="true"
						className={cn(
							"font-medium",
							strengthLevel < 2
								? "text-destructive"
								: strengthLevel === 2
									? "text-warning"
									: "text-success",
						)}
					>
						{strengthLabel}
					</span>
				</div>
				<div
					className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
					role="progressbar"
					aria-valuenow={strengthLevel}
					aria-valuemin={0}
					aria-valuemax={3}
					// `aria-valuetext` : sans lui, l'échelle 0-3 est vocalisée en chiffres
					// bruts (« 2 »), dénués de sens pour l'utilisateur.
					aria-valuetext={strengthLabel}
					aria-label="Force du mot de passe"
				>
					<div
						className={cn("h-full rounded-full transition-all duration-300", strengthColor)}
						style={{ width: `${(strengthLevel / 3) * 100}%` }}
					/>
				</div>
			</div>

			{/* Liste des critères */}
			<ul className="space-y-1 text-xs" aria-label="Critères du mot de passe">
				{PASSWORD_RULES.map((rule) => {
					const isValid = rule.test(password);
					return (
						<li
							key={rule.label}
							className={cn(
								"flex items-center gap-1.5 transition-colors",
								isValid ? "text-success" : "text-muted-foreground",
							)}
						>
							{isValid ? (
								<CheckIcon className="size-3" aria-hidden="true" />
							) : (
								<XIcon className="size-3" aria-hidden="true" />
							)}
							<span>
								{rule.label}
								{isValid && <span className="sr-only"> (validé)</span>}
							</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
