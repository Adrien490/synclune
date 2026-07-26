"use client";

import { CircleX } from "lucide-react";
import { useEffect, useRef } from "react";

import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { useHaptic } from "@/shared/hooks/use-haptic";

interface FormServerErrorAlertProps {
	/** Messages d'erreur serveur non rattachables à un champ (globaux) */
	errors: string[];
	className?: string;
}

/**
 * Alerte d'erreur serveur globale pour formulaires (pattern des forms auth) :
 * `role="alert"` + `aria-live="assertive"` + focus programmatique à l'apparition
 * (WCAG 3.3.1) + haptique. À utiliser pour les VALIDATION_ERROR serveur qui ne
 * sont pas mappées à un champ — `createToastCallbacks` les exclut du toast en
 * supposant un affichage inline.
 */
export function FormServerErrorAlert({ errors, className }: FormServerErrorAlertProps) {
	const alertRef = useRef<HTMLDivElement>(null);
	const triggerHaptic = useHaptic();
	const errorsKey = errors.join("\n");

	useEffect(() => {
		if (!errorsKey) return;
		alertRef.current?.focus();
		triggerHaptic("error");
	}, [errorsKey, triggerHaptic]);

	if (errors.length === 0) return null;

	return (
		<Alert
			ref={alertRef}
			variant="destructive"
			tabIndex={-1}
			role="alert"
			aria-live="assertive"
			className={className}
		>
			<CircleX aria-hidden="true" />
			<AlertDescription>
				{errors.length === 1 ? (
					errors[0]
				) : (
					<ul className="list-disc space-y-1 pl-4">
						{errors.map((message) => (
							<li key={message}>{message}</li>
						))}
					</ul>
				)}
			</AlertDescription>
		</Alert>
	);
}
