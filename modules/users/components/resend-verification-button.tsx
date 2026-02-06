"use client";

import { Button } from "@/shared/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import { useResendVerificationEmail } from "@/modules/auth/hooks/use-resend-verification-email";
import { useState, useEffect } from "react";
import { getResendVerificationCooldownKey } from "@/shared/constants/storage-keys";

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
	const COOLDOWN_KEY = getResendVerificationCooldownKey(email);

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

	// Démarrer le cooldown au succès via callback du hook
	const startCooldown = () => {
		localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
		setCooldown(COOLDOWN_DURATION);
	};

	const { action, isPending } = useResendVerificationEmail({
		onSuccess: startCooldown,
	});

	// Timer du cooldown (séparé, une seule responsabilité)
	useEffect(() => {
		if (cooldown <= 0) return;

		const interval = setInterval(() => {
			setCooldown((prev) => {
				if (prev <= 1) {
					localStorage.removeItem(COOLDOWN_KEY);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [cooldown, COOLDOWN_KEY]);

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
