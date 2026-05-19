"use client";

import { useCookieConsentStore } from "@/shared/providers/cookie-consent-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";

type ManageCookiesButtonProps = {
	className?: string;
};

export function ManageCookiesButton({ className }: ManageCookiesButtonProps) {
	const resetConsent = useCookieConsentStore((state) => state.resetConsent);
	const triggerHaptic = useHaptic();

	const handleClick = () => {
		triggerHaptic("light");
		resetConsent();
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			aria-label="Modifier mes préférences cookies"
			className={className}
		>
			Modifier mes préférences
		</button>
	);
}
