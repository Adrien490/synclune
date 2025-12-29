/**
 * Props communes pour les composants error.tsx de Next.js
 */
export type ErrorPageProps = {
	error: Error & { digest?: string };
	reset: () => void;
};
