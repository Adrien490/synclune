import { Section, Text } from "react-email";
import { EMAIL_CLASSES, EMAIL_STYLES } from "./email-colors";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";
import { TrackingInfo } from "./_components/tracking-info";

interface TrackingUpdateEmailProps {
	orderNumber: string;
	customerName: string;
	trackingNumber: string;
	trackingUrl: string | null;
	carrierLabel: string;
}

export const TrackingUpdateEmail = ({
	orderNumber,
	customerName,
	trackingNumber,
	trackingUrl,
	carrierLabel,
}: TrackingUpdateEmailProps) => {
	return (
		<EmailLayout preview={`Suivi mis à jour - ${orderNumber}`}>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Suivi mis à jour</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName}, les informations de suivi de votre commande {orderNumber} ont été
					mises à jour.
				</Text>
			</Section>

			<Section style={{ marginBottom: "24px" }}>
				<TrackingInfo carrierLabel={carrierLabel} trackingNumber={trackingNumber} />
			</Section>

			{trackingUrl && <EmailCTA href={trackingUrl}>Suivre mon colis</EmailCTA>}
		</EmailLayout>
	);
};

TrackingUpdateEmail.PreviewProps = {
	orderNumber: "CMD-1730000000-ABCD",
	customerName: "Marie",
	trackingNumber: "8N00234567890",
	trackingUrl: "https://www.laposte.fr/outils/suivre-vos-envois?code=8N00234567890",
	carrierLabel: "Colissimo",
} as TrackingUpdateEmailProps;

export default TrackingUpdateEmail;
