import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";

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
		<Html>
			<Head />
			<Preview>Suivi mis à jour - {orderNumber}</Preview>
			<Body style={{ backgroundColor: EMAIL_COLORS.background.main }}>
				<Container style={EMAIL_STYLES.container}>
					{/* Header */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "24px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							Synclune
						</Text>
					</Section>

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
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "8px",
								}}
							>
								<Text style={EMAIL_STYLES.text.small}>Transporteur</Text>
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
							</div>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: estimatedDelivery ? "8px" : "0",
								}}
							>
								<Text style={EMAIL_STYLES.text.small}>Numéro de suivi</Text>
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
							</div>
							{estimatedDelivery && (
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
									}}
								>
									<Text style={EMAIL_STYLES.text.small}>Livraison estimée</Text>
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
								</div>
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

					{/* Footer */}
					<Section
						style={{
							paddingTop: "24px",
							borderTop: `1px solid ${EMAIL_COLORS.border}`,
							textAlign: "center",
						}}
					>
						<Text style={EMAIL_STYLES.text.tiny}>
							© {new Date().getFullYear()} Synclune
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
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
