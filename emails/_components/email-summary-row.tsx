import { Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "../email-colors";
import { FlexRow } from "./flex-row";

interface EmailSummaryRowProps {
	label: string;
	value: string | React.ReactNode;
	/**
	 * Variante de présentation de la valeur :
	 * - `default` : texte simple
	 * - `mono` : police monospace (numéros de commande, codes)
	 * - `highlight` : monospace + couleur primary + gras (montants totaux)
	 */
	variant?: "default" | "mono" | "highlight";
	style?: React.CSSProperties;
}

/**
 * Ligne d'un bloc récapitulatif label/valeur — Outlook-compatible (Row/Column).
 * Pattern consolidé des `<FlexRow left={<Text>Label</Text>} right={<Text>...</Text>}>`.
 */
export function EmailSummaryRow({
	label,
	value,
	variant = "default",
	style,
}: EmailSummaryRowProps) {
	const valueStyle: React.CSSProperties = (() => {
		const base: React.CSSProperties = {
			margin: 0,
			fontSize: "14px",
			color: EMAIL_COLORS.text.primary,
		};
		if (variant === "mono") {
			return { ...base, fontFamily: "monospace", fontWeight: "600" };
		}
		if (variant === "highlight") {
			return {
				...base,
				fontFamily: "monospace",
				fontWeight: "bold",
				color: EMAIL_COLORS.primary,
			};
		}
		return base;
	})();

	return (
		<FlexRow
			style={style}
			left={
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					{label}
				</Text>
			}
			right={
				typeof value === "string" ? (
					<Text className={EMAIL_CLASSES.text.body} style={valueStyle}>
						{value}
					</Text>
				) : (
					value
				)
			}
		/>
	);
}
