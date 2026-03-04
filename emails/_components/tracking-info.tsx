import { Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "../email-colors";
import { FlexRow } from "./flex-row";

interface TrackingInfoProps {
	carrierLabel: string;
	trackingNumber: string;
}

export const TrackingInfo = ({ carrierLabel, trackingNumber }: TrackingInfoProps) => {
	return (
		<Section style={EMAIL_STYLES.section.card}>
			<FlexRow
				style={{ marginBottom: "8px" }}
				left={<Text style={EMAIL_STYLES.text.small}>Transporteur</Text>}
				right={
					<Text
						style={{
							margin: 0,
							fontSize: "14px",
							fontWeight: "600",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						{carrierLabel}
					</Text>
				}
			/>
			<FlexRow
				style={{ marginBottom: "0" }}
				left={<Text style={EMAIL_STYLES.text.small}>Numéro de suivi</Text>}
				right={
					<Text
						style={{
							margin: 0,
							fontFamily: "monospace",
							fontSize: "14px",
							fontWeight: "600",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						{trackingNumber}
					</Text>
				}
			/>
		</Section>
	);
};
