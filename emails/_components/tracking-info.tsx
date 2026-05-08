import { Text } from "react-email";
import { EMAIL_CLASSES, EMAIL_COLORS } from "../email-colors";
import { EmailCard } from "./email-card";
import { EmailSummaryRow } from "./email-summary-row";

interface TrackingInfoProps {
	carrierLabel: string;
	trackingNumber: string;
}

export const TrackingInfo = ({ carrierLabel, trackingNumber }: TrackingInfoProps) => {
	return (
		<EmailCard>
			<EmailSummaryRow
				style={{ marginBottom: "8px" }}
				label="Transporteur"
				value={
					<Text
						className={EMAIL_CLASSES.text.body}
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
			<EmailSummaryRow
				style={{ marginBottom: "0" }}
				label="Numéro de suivi"
				value={trackingNumber}
				variant="mono"
			/>
		</EmailCard>
	);
};
