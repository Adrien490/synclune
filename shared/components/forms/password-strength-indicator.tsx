"use client";

import { cn } from "@/shared/utils/cn";
import { Check, X } from "lucide-react";
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
		<div className="space-y-3" aria-live="polite">
			{/* Barre de progression */}
			<div className="space-y-1.5">
				<div className="flex justify-between text-xs">
					<span className="text-muted-foreground">Force du mot de passe</span>
					<span
						className={cn(
							"font-medium",
							strengthLevel < 2
								? "text-destructive"
								: strengthLevel === 2
									? "text-yellow-600 dark:text-yellow-400"
									: "text-green-600 dark:text-green-400",
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
					aria-label={`Force du mot de passe : ${strengthLabel}`}
				>
					<div
						className={cn("h-full rounded-full transition-all duration-300", strengthColor)}
						style={{ width: `${(strengthLevel / 3) * 100}%` }}
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
								isValid ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
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
