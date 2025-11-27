"use client";

import { Button } from "@/shared/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import { useResendVerificationEmail } from "@/modules/auth/hooks/use-resend-verification-email";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ActionStatus } from "@/shared/types/server-action";

interface ResendVerificationButtonProps {
	email: string;
}

/**
 * Bouton pour renvoyer l'email de vérification
 * Inclut un cooldown de 60 secondes pour éviter le spam
 * Le cooldown persiste via localStorage pour survivre aux rafraîchissements
 */
export function ResendVerificationButton({
	email,
}: ResendVerificationButtonProps) {
	const COOLDOWN_KEY = `resend-cooldown-${email}`;
	const COOLDOWN_DURATION = 60;

	// Initialize cooldown from localStorage (survives page refresh)
	const [cooldown, setCooldown] = useState(() => {
		if (typeof window === "undefined") return 0;

		const stored = localStorage.getItem(COOLDOWN_KEY);
		if (stored) {
			const startTime = parseInt(stored, 10);
			const elapsed = Math.floor((Date.now() - startTime) / 1000);
			const remaining = Math.max(0, COOLDOWN_DURATION - elapsed);
			return remaining;
		}
		return 0;
	});

	const { action, isPending, state } = useResendVerificationEmail();

	// Handle success/error states with toast and persist cooldown
	useEffect(() => {
		if (state?.status === ActionStatus.SUCCESS) {
			toast.success(state.message || "Email de vérification envoyé");

			// Store start time in localStorage
			localStorage.setItem(COOLDOWN_KEY, Date.now().toString());

			// Start 60s cooldown
			setCooldown(COOLDOWN_DURATION);

			const interval = setInterval(() => {
				setCooldown((prev) => {
					if (prev <= 1) {
						clearInterval(interval);
						// Cleanup localStorage when cooldown finishes
						localStorage.removeItem(COOLDOWN_KEY);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			// Cleanup interval on unmount
			return () => clearInterval(interval);
		} else if (
			state?.status === ActionStatus.ERROR ||
			state?.status === ActionStatus.VALIDATION_ERROR
		) {
			toast.error(state.message || "Erreur lors de l'envoi");
		}
	}, [state, COOLDOWN_KEY, COOLDOWN_DURATION]);

	// Restart interval if cooldown > 0 on mount (after page refresh)
	useEffect(() => {
		if (cooldown > 0) {
			const interval = setInterval(() => {
				setCooldown((prev) => {
					if (prev <= 1) {
						clearInterval(interval);
						// Cleanup localStorage when cooldown finishes
						localStorage.removeItem(COOLDOWN_KEY);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			// Cleanup interval on unmount
			return () => clearInterval(interval);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Empty deps = run once on mount (intentional to restart countdown after refresh)

	const handleResend = () => {
		const formData = new FormData();
		formData.append("email", email);
		action(formData);
	};

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			onClick={handleResend}
			disabled={isPending || cooldown > 0}
		>
			{isPending ? (
				<>
					<Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
					Envoi...
				</>
			) : cooldown > 0 ? (
				<>Renvoyer dans {cooldown}s</>
			) : (
				<>
					<Mail className="h-3 w-3" aria-hidden="true" />
					Renvoyer l&apos;email
				</>
			)}
		</Button>
	);
}
