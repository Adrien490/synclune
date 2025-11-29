"use client";

import { Button } from "@/shared/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import { useResendVerificationEmail } from "@/modules/auth/hooks/use-resend-verification-email";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ActionStatus } from "@/shared/types/server-action";

interface ResendVerificationButtonProps {
	email: string;
}

const COOLDOWN_DURATION = 60;

/**
 * Bouton pour renvoyer l'email de vérification
 * Inclut un cooldown de 60 secondes pour éviter le spam
 * Le cooldown persiste via localStorage pour survivre aux rafraîchissements
 */
export function ResendVerificationButton({
	email,
}: ResendVerificationButtonProps) {
	const COOLDOWN_KEY = `resend-cooldown-${email}`;

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

	// Ref pour tracker si on a déjà traité ce state (évite double toast)
	const lastProcessedStateRef = useRef<typeof state>(null);

	// UN SEUL useEffect qui gère:
	// 1. Les toasts success/error
	// 2. Le démarrage du cooldown (après success OU au mount si cooldown > 0)
	useEffect(() => {
		// Gérer les toasts (seulement si le state a changé)
		if (state && state !== lastProcessedStateRef.current) {
			lastProcessedStateRef.current = state;

			if (state.status === ActionStatus.SUCCESS) {
				toast.success(state.message || "Email de vérification envoyé");
				// Store start time in localStorage
				localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
				// Start cooldown
				setCooldown(COOLDOWN_DURATION);
			} else if (
				state.status === ActionStatus.ERROR ||
				state.status === ActionStatus.VALIDATION_ERROR
			) {
				toast.error(state.message || "Erreur lors de l'envoi");
			}
		}

		// Gérer l'interval du cooldown (si cooldown > 0)
		if (cooldown > 0) {
			const interval = setInterval(() => {
				setCooldown((prev) => {
					if (prev <= 1) {
						clearInterval(interval);
						localStorage.removeItem(COOLDOWN_KEY);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			return () => clearInterval(interval);
		}
	}, [cooldown, state, COOLDOWN_KEY]);

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
