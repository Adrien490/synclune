import { Row, Column } from "@react-email/components";

interface FlexRowProps {
	left: React.ReactNode;
	right: React.ReactNode;
	style?: React.CSSProperties;
}

/**
 * Table-based two-column layout compatible with Outlook.
 * Replaces `display: flex; justifyContent: space-between` patterns.
 *
 * `role="presentation"` marque cette table comme structurelle uniquement,
 * empêchant les screen readers de l'annoncer comme une table de données.
 */
export function FlexRow({ left, right, style }: FlexRowProps) {
	return (
		<Row role="presentation" style={style}>
			<Column style={{ verticalAlign: "top" }}>{left}</Column>
			<Column style={{ textAlign: "right", verticalAlign: "top" }}>{right}</Column>
		</Row>
	);
}
