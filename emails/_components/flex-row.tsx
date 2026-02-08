import { Row, Column } from "@react-email/components";

interface FlexRowProps {
	left: React.ReactNode;
	right: React.ReactNode;
	style?: React.CSSProperties;
}

/**
 * Table-based two-column layout compatible with Outlook.
 * Replaces `display: flex; justifyContent: space-between` patterns.
 */
export function FlexRow({ left, right, style }: FlexRowProps) {
	return (
		<Row style={style}>
			<Column style={{ verticalAlign: "top" }}>{left}</Column>
			<Column style={{ textAlign: "right", verticalAlign: "top" }}>
				{right}
			</Column>
		</Row>
	);
}
