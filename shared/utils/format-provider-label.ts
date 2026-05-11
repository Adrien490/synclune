/**
 * Mappe un providerId Better Auth (`google`, `apple`, `github`, `credential`) vers
 * un label affichable utilisateur ("Google", "Apple", "GitHub", "email/mot de passe").
 *
 * Évite les capitalisations ad-hoc dispersées (`provider === "google" ? "Google" : provider`).
 */
const PROVIDER_LABELS: Record<string, string> = {
	google: "Google",
	apple: "Apple",
	github: "GitHub",
	credential: "email/mot de passe",
};

export function formatProviderLabel(providerId: string): string {
	return PROVIDER_LABELS[providerId] ?? providerId;
}
