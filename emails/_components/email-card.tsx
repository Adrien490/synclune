import { Section } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_STYLES } from "../email-colors";

interface EmailCardProps {
	children: React.ReactNode;
	style?: React.CSSProperties;
}

/**
 * Section card réutilisable — dark mode + mobile responsive via className.
 * Remplace les `<Section style={EMAIL_STYLES.section.card}>` inlinés.
 */
export function EmailCard({ children, style }: EmailCardProps) {
	return (
		<Section className={EMAIL_CLASSES.card} style={{ ...EMAIL_STYLES.section.card, ...style }}>
			{children}
		</Section>
	);
}
