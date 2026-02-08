import { Button, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";
import { FlexRow } from "./_components/flex-row";

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
					Bonjour {customerName}, les informations de suivi de ta commande{" "}
					{orderNumber} ont été mises à jour.
				</Text>
			</Section>

			{/* Suivi */}
			<Section style={{ marginBottom: "24px" }}>
				<div style={EMAIL_STYLES.section.card}>
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
						style={{ marginBottom: estimatedDelivery ? "8px" : "0" }}
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
					{estimatedDelivery && (
						<FlexRow
							left={<Text style={EMAIL_STYLES.text.small}>Livraison estimée</Text>}
							right={
								<Text
									style={{
										margin: 0,
										fontSize: "14px",
										fontWeight: "600",
										color: EMAIL_COLORS.primary,
									}}
								>
									{estimatedDelivery}
								</Text>
							}
						/>
					)}
				</div>
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
