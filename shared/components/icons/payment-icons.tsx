/**
 * Icônes de moyens de paiement pour le footer
 *
 * Affichées en grayscale pour s'intégrer au design sobre du footer.
 * Taille optimisée ratio carte bancaire (32x20).
 */

interface PaymentIconProps {
	className?: string;
}

export function VisaIcon({ className = "" }: PaymentIconProps) {
	return (
		<svg
			width="32"
			height="20"
			viewBox="0 0 32 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			role="img"
			aria-label="Visa"
		>
			<title>Visa</title>
			<rect
				x="0.5"
				y="0.5"
				width="31"
				height="19"
				rx="2.5"
				fill="white"
				stroke="currentColor"
				strokeOpacity="0.2"
			/>
			<path
				d="M13.5 13.5L14.8 6.5H16.5L15.2 13.5H13.5ZM11.5 6.5L9.8 11.3L9.5 10L8.7 7.2C8.6 6.8 8.3 6.5 7.8 6.5H5.2L5.1 6.7C5.9 6.9 6.6 7.2 7.2 7.5L8.8 13.5H10.7L13.3 6.5H11.5ZM24.5 13.5H26.2L24.7 6.5H23.3C22.9 6.5 22.6 6.7 22.4 7.1L19.5 13.5H21.4L21.8 12.4H24.1L24.5 13.5ZM22.3 10.9L23.3 8.2L23.9 10.9H22.3ZM19.2 8.7L19.5 6.7C18.9 6.5 18.2 6.3 17.5 6.3C16.1 6.3 15.1 7.1 15.1 8.2C15.1 9.1 15.9 9.6 16.6 9.9C17.3 10.2 17.5 10.5 17.5 10.8C17.5 11.3 16.9 11.5 16.4 11.5C15.6 11.5 15.1 11.4 14.4 11L14.1 13C14.6 13.2 15.5 13.4 16.3 13.4C17.9 13.4 18.9 12.6 18.9 11.4C18.9 10 17.1 9.9 17.1 9C17.1 8.6 17.4 8.3 18.1 8.3C18.5 8.3 18.9 8.4 19.2 8.7Z"
				fill="currentColor"
				fillOpacity="0.7"
			/>
		</svg>
	);
}

export function MastercardIcon({ className = "" }: PaymentIconProps) {
	return (
		<svg
			width="32"
			height="20"
			viewBox="0 0 32 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			role="img"
			aria-label="Mastercard"
		>
			<title>Mastercard</title>
			<rect
				x="0.5"
				y="0.5"
				width="31"
				height="19"
				rx="2.5"
				fill="white"
				stroke="currentColor"
				strokeOpacity="0.2"
			/>
			<circle cx="12" cy="10" r="5" fill="currentColor" fillOpacity="0.5" />
			<circle cx="20" cy="10" r="5" fill="currentColor" fillOpacity="0.35" />
			<path
				d="M16 6.34C17.2 7.28 18 8.74 18 10.4C18 12.06 17.2 13.52 16 14.46C14.8 13.52 14 12.06 14 10.4C14 8.74 14.8 7.28 16 6.34Z"
				fill="currentColor"
				fillOpacity="0.6"
			/>
		</svg>
	);
}

export function CBIcon({ className = "" }: PaymentIconProps) {
	return (
		<svg
			width="32"
			height="20"
			viewBox="0 0 32 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			role="img"
			aria-label="Carte Bancaire"
		>
			<title>Carte Bancaire</title>
			<rect
				x="0.5"
				y="0.5"
				width="31"
				height="19"
				rx="2.5"
				fill="white"
				stroke="currentColor"
				strokeOpacity="0.2"
			/>
			<rect x="4" y="4" width="24" height="5" rx="1" fill="currentColor" fillOpacity="0.15" />
			<rect x="4" y="11" width="10" height="2" rx="0.5" fill="currentColor" fillOpacity="0.5" />
			<rect x="4" y="14" width="6" height="2" rx="0.5" fill="currentColor" fillOpacity="0.3" />
			<text
				x="23"
				y="15"
				fontSize="5"
				fontWeight="bold"
				fill="currentColor"
				fillOpacity="0.6"
				fontFamily="system-ui"
			>
				CB
			</text>
		</svg>
	);
}

export function PayPalIcon({ className = "" }: PaymentIconProps) {
	return (
		<svg
			width="32"
			height="20"
			viewBox="0 0 32 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			role="img"
			aria-label="PayPal"
		>
			<title>PayPal</title>
			<rect
				x="0.5"
				y="0.5"
				width="31"
				height="19"
				rx="2.5"
				fill="white"
				stroke="currentColor"
				strokeOpacity="0.2"
			/>
			<path
				d="M12.5 5H15.5C17 5 18 6 18 7.5C18 9 17 10 15.5 10H14L13.5 13H11.5L12.5 5Z"
				fill="currentColor"
				fillOpacity="0.5"
			/>
			<path
				d="M14.5 6H17.5C19 6 20 7 20 8.5C20 10 19 11 17.5 11H16L15.5 14H13.5L14.5 6Z"
				fill="currentColor"
				fillOpacity="0.35"
			/>
		</svg>
	);
}
