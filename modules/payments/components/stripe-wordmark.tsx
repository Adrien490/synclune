/**
 * Logo Stripe officiel (wordmark)
 * Utilisé pour renforcer la confiance au checkout (Baymard: badges tiers reconnus)
 */

interface StripeWordmarkProps {
	className?: string;
}

export function StripeWordmark({ className = "" }: StripeWordmarkProps) {
	return (
		<svg
			width="49"
			height="20"
			viewBox="0 0 49 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			role="img"
			aria-label="Stripe"
		>
			<title>Stripe</title>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M48.4 10.2C48.4 6.8 46.8 4.2 43.7 4.2C40.6 4.2 38.7 6.8 38.7 10.2C38.7 14.2 41 16.2 44.3 16.2C45.9 16.2 47.1 15.8 48 15.3V12.6C47.1 13.1 46.1 13.4 44.8 13.4C43.5 13.4 42.4 13 42.2 11.4H48.4C48.4 11.2 48.4 10.5 48.4 10.2ZM42.1 8.9C42.1 7.4 43 6.7 43.7 6.7C44.4 6.7 45.2 7.4 45.2 8.9H42.1ZM33.5 4.2C32.2 4.2 31.4 4.8 30.9 5.2L30.7 4.4H27.6V19.6L31.1 18.8V15.6C31.6 15.9 32.3 16.2 33.3 16.2C35.8 16.2 38.1 14.1 38.1 10C38.1 6.3 35.7 4.2 33.5 4.2ZM32.6 13.3C31.9 13.3 31.4 13.1 31.1 12.8V7.8C31.4 7.5 32 7.2 32.6 7.2C33.8 7.2 34.6 8.5 34.6 10.2C34.6 12 33.8 13.3 32.6 13.3ZM23.8 3.2L27.3 2.5V0L23.8 0.8V3.2ZM23.8 4.4H27.3V16H23.8V4.4ZM19.7 5.4L19.5 4.4H16.5V16H20V8.4C20.7 7.5 22 7.6 22.4 7.8V4.4C21.9 4.2 20.4 3.9 19.7 5.4ZM12.8 1.6L9.4 2.4L9.3 12.6C9.3 14.6 10.8 16.2 12.8 16.2C13.9 16.2 14.7 16 15.2 15.8V13C14.7 13.2 12.8 13.7 12.8 11.7V7.3H15.2V4.4H12.8V1.6ZM5.3 8C5.3 7.4 5.8 7.1 6.6 7.1C7.7 7.1 9.1 7.4 10.2 8V4.8C9 4.4 7.8 4.2 6.6 4.2C3.6 4.2 1.7 5.7 1.7 8.2C1.7 12.1 7.1 11.5 7.1 13.2C7.1 13.9 6.5 14.2 5.6 14.2C4.4 14.2 2.8 13.7 1.6 13V16.3C2.9 16.8 4.3 17 5.6 17C8.7 17 10.7 15.5 10.7 13C10.7 8.8 5.3 9.5 5.3 8Z"
				fill="currentColor"
			/>
		</svg>
	);
}
