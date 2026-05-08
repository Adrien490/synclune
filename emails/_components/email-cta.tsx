import { Button, Section } from "react-email";
import { EMAIL_CLASSES, EMAIL_STYLES } from "../email-colors";

interface EmailCTAProps {
	href: string;
	children: React.ReactNode;
	variant?: "primary" | "outline";
	/**
	 * Espacement inférieur de la section CTA. Défaut 32px — passer à une valeur
	 * plus faible (ex: 24px) quand une section info suit immédiatement le CTA.
	 */
	marginBottom?: string;
}

/**
 * Call-to-action réutilisable — touch target 44px+, full-width mobile via className.
 * Pattern consolidé des `<Section><Button /></Section>` centrés.
 */
export function EmailCTA({
	href,
	children,
	variant = "primary",
	marginBottom = "32px",
}: EmailCTAProps) {
	return (
		<Section style={{ marginBottom, textAlign: "center" }}>
			<Button
				href={href}
				className={EMAIL_CLASSES.button[variant]}
				style={EMAIL_STYLES.button[variant]}
			>
				{children}
			</Button>
		</Section>
	);
}
