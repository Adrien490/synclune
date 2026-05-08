import { Text } from "react-email";
import { EMAIL_CLASSES, EMAIL_STYLES } from "../email-colors";

interface EmailHeadingProps {
	level: "h1" | "h2" | "h3";
	children: React.ReactNode;
	style?: React.CSSProperties;
}

/**
 * Wrapper de `<Text>` appliquant la hiérarchie sémantique (className)
 * + les styles inline par défaut pour chaque niveau.
 *
 * La className (`email-h1/h2/h3`) permet aux media queries d'ajuster
 * la typo en mobile sans modifier chaque template.
 */
export function EmailHeading({ level, children, style }: EmailHeadingProps) {
	return (
		<Text
			className={EMAIL_CLASSES.heading[level]}
			style={{ ...EMAIL_STYLES.heading[level], ...style }}
		>
			{children}
		</Text>
	);
}
