"use client";

import { cn } from "@/shared/utils/cn";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
	password: string;
}

interface PasswordRule {
	label: string;
	test: (password: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
	{
		label: "Au moins 8 caractères",
		test: (password) => password.length >= 8,
	},
	{
		label: "Une lettre majuscule",
		test: (password) => /[A-Z]/.test(password),
	},
	{
		label: "Une lettre minuscule",
		test: (password) => /[a-z]/.test(password),
	},
	{
		label: "Un chiffre",
		test: (password) => /[0-9]/.test(password),
	},
	{
		label: "Un caractère spécial",
		test: (password) => /[^A-Za-z0-9]/.test(password),
	},
];

function getStrengthLevel(password: string): number {
	if (!password) return 0;
	return PASSWORD_RULES.filter((rule) => rule.test(password)).length;
}

function getStrengthLabel(level: number): string {
	switch (level) {
		case 0:
		case 1:
			return "Très faible";
		case 2:
			return "Faible";
		case 3:
			return "Moyen";
		case 4:
			return "Fort";
		case 5:
			return "Très fort";
		default:
			return "";
	}
}

function getStrengthColor(level: number): string {
	switch (level) {
		case 0:
		case 1:
			return "bg-destructive";
		case 2:
			return "bg-orange-500";
		case 3:
			return "bg-yellow-500";
		case 4:
			return "bg-green-500";
		case 5:
			return "bg-green-600";
		default:
			return "bg-muted";
	}
}

export function PasswordStrengthIndicator({
	password,
}: PasswordStrengthIndicatorProps) {
	const strengthLevel = getStrengthLevel(password);
	const strengthLabel = getStrengthLabel(strengthLevel);
	const strengthColor = getStrengthColor(strengthLevel);

	if (!password) return null;

	return (
		<div className="space-y-3" aria-live="polite">
			{/* Barre de progression */}
			<div className="space-y-1.5">
				<div className="flex justify-between text-xs">
					<span className="text-muted-foreground">Force du mot de passe</span>
					<span
						className={cn(
							"font-medium",
							strengthLevel <= 2
								? "text-destructive"
								: strengthLevel <= 3
									? "text-yellow-600"
									: "text-green-600"
						)}
					>
						{strengthLabel}
					</span>
				</div>
				<div
					className="h-1.5 w-full bg-muted rounded-full overflow-hidden"
					role="progressbar"
					aria-valuenow={strengthLevel}
					aria-valuemin={0}
					aria-valuemax={5}
					aria-label={`Force du mot de passe : ${strengthLabel}`}
				>
					<div
						className={cn(
							"h-full transition-all duration-300 rounded-full",
							strengthColor
						)}
						style={{ width: `${(strengthLevel / 5) * 100}%` }}
					/>
				</div>
			</div>

			{/* Liste des critères */}
			<ul className="space-y-1 text-xs" aria-label="Critères du mot de passe">
				{PASSWORD_RULES.map((rule, index) => {
					const isValid = rule.test(password);
					return (
						<li
							key={index}
							className={cn(
								"flex items-center gap-1.5 transition-colors",
								isValid ? "text-green-600" : "text-muted-foreground"
							)}
						>
							{isValid ? (
								<Check className="h-3 w-3" aria-hidden="true" />
							) : (
								<X className="h-3 w-3" aria-hidden="true" />
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
