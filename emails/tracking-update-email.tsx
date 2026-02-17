import { Button, Section, Text } from "@react-email/components";
import { EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";
import { TrackingInfo } from "./_components/tracking-info";

interface TrackingUpdateEmailProps {
	orderNumber: string;
	customerName: string;
	trackingNumber: string;
	trackingUrl: string | null;
	carrierLabel: string;
	estimatedDelivery?: string;
}

export const TrackingUpdateEmail = ({
	orderNumber,
	customerName,
	trackingNumber,
	trackingUrl,
	carrierLabel,
	estimatedDelivery,
}: TrackingUpdateEmailProps) => {
	return (
		<EmailLayout preview={`Suivi mis à jour - ${orderNumber}`}>
			{/* Titre */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.heading.h2}>Suivi mis à jour</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
					Bonjour {customerName}, les informations de suivi de votre commande{" "}
					{orderNumber} ont été mises à jour.
				</Text>
			</Section>

			{/* Suivi */}
			<Section style={{ marginBottom: "24px" }}>
				<TrackingInfo
					carrierLabel={carrierLabel}
					trackingNumber={trackingNumber}
					estimatedDelivery={estimatedDelivery}
				/>
			</Section>

			{/* CTA */}
			{trackingUrl && (
				<Section style={{ marginBottom: "32px", textAlign: "center" }}>
					<Button href={trackingUrl} style={EMAIL_STYLES.button.primary}>
						Suivre mon colis
					</Button>
				</Section>
			)}
		</EmailLayout>
	);
};

TrackingUpdateEmail.PreviewProps = {
	orderNumber: "CMD-1730000000-ABCD",
	customerName: "Marie",
	trackingNumber: "8N00234567890",
	trackingUrl:
		"https://www.laposte.fr/outils/suivre-vos-envois?code=8N00234567890",
	carrierLabel: "Colissimo",
	estimatedDelivery: "3-5 jours ouvrés",
} as TrackingUpdateEmailProps;

export default TrackingUpdateEmail;
