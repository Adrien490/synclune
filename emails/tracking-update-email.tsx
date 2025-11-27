import {
	Body,
	Button,
	Container,
	Head,
	Hr,
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
	shippingAddress: {
		firstName: string;
		lastName: string;
		address1: string;
		address2?: string | null;
		postalCode: string;
		city: string;
		country: string;
	};
	estimatedDelivery?: string;
}

export const TrackingUpdateEmail = ({
	orderNumber,
	customerName,
	trackingNumber,
	trackingUrl,
	carrierLabel,
	shippingAddress,
	estimatedDelivery,
}: TrackingUpdateEmailProps) => {
	return (
		<Html>
			<Head />
			<Preview>Mise à jour du suivi de ta commande {orderNumber}</Preview>
			<Body style={{ backgroundColor: EMAIL_COLORS.background.main }}>
				<Container style={EMAIL_STYLES.container}>
					{/* Header */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "28px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							Synclune
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "8px" }}>
							Créations artisanales
						</Text>
					</Section>

					{/* Titre avec icône */}
					<Section style={{ marginBottom: "24px", textAlign: "center" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "48px",
							}}
						>
							🔄
						</Text>
						<Text
							style={{
								...EMAIL_STYLES.heading.h2,
								marginTop: "16px",
							}}
						>
							Mise à jour de ton suivi
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "16px" }}>
							Bonjour {customerName},
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "8px" }}>
							Les informations de suivi de ta commande ont été mises à jour.
						</Text>
					</Section>

					{/* Numéro de commande */}
					<Section
						style={{
							...EMAIL_STYLES.section.card,
							marginBottom: "24px",
							textAlign: "center",
						}}
					>
						<Text
							style={{
								margin: 0,
								fontSize: "14px",
								fontWeight: "500",
								color: EMAIL_COLORS.text.secondary,
							}}
						>
							Numéro de commande
						</Text>
						<Text
							style={{
								margin: "4px 0 0 0",
								fontFamily: "monospace",
								fontSize: "20px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							{orderNumber}
						</Text>
					</Section>

					{/* Nouvelles informations de suivi */}
					<Section style={{ marginBottom: "32px" }}>
						<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "16px" }}>
							Nouvelles informations de suivi
						</Text>

						<div style={EMAIL_STYLES.section.card}>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "12px",
								}}
							>
								<Text
									style={{
										margin: 0,
										fontSize: "14px",
										color: EMAIL_COLORS.text.secondary,
									}}
								>
									Transporteur
								</Text>
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
									marginBottom: estimatedDelivery ? "12px" : "0",
								}}
							>
								<Text
									style={{
										margin: 0,
										fontSize: "14px",
										color: EMAIL_COLORS.text.secondary,
									}}
								>
									Numéro de suivi
								</Text>
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
									<Text
										style={{
											margin: 0,
											fontSize: "14px",
											color: EMAIL_COLORS.text.secondary,
										}}
									>
										Livraison estimée
									</Text>
									<Text
										style={{
											margin: 0,
											fontSize: "14px",
											fontWeight: "600",
											color: EMAIL_COLORS.states.success,
										}}
									>
										{estimatedDelivery}
									</Text>
								</div>
							)}
						</div>
					</Section>

					{/* CTA Suivi */}
					{trackingUrl && (
						<Section style={{ marginBottom: "32px", textAlign: "center" }}>
							<Button href={trackingUrl} style={EMAIL_STYLES.button.primary}>
								Suivre mon colis
							</Button>
							<Text
								style={{
									...EMAIL_STYLES.text.tiny,
									marginTop: "12px",
								}}
							>
								Clique sur le bouton pour voir où en est ton colis en temps réel
							</Text>
						</Section>
					)}

					{/* Adresse de livraison */}
					<Section style={{ marginBottom: "32px" }}>
						<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "12px" }}>
							Adresse de livraison
						</Text>
						<div style={EMAIL_STYLES.section.card}>
							<Text style={{ ...EMAIL_STYLES.text.body, margin: 0 }}>
								{shippingAddress.firstName} {shippingAddress.lastName}
							</Text>
							<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}>
								{shippingAddress.address1}
							</Text>
							{shippingAddress.address2 && (
								<Text style={EMAIL_STYLES.text.small}>
									{shippingAddress.address2}
								</Text>
							)}
							<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}>
								{shippingAddress.postalCode} {shippingAddress.city}
							</Text>
							<Text style={EMAIL_STYLES.text.small}>
								{shippingAddress.country}
							</Text>
						</div>
					</Section>

					<Hr style={EMAIL_STYLES.hr} />

					{/* Message personnel */}
					<Section style={{ marginBottom: "24px", textAlign: "center" }}>
						<Text style={EMAIL_STYLES.text.body}>
							Merci pour ta confiance et à très vite !
						</Text>
						<Text
							style={{
								...EMAIL_STYLES.text.body,
								marginTop: "8px",
								fontStyle: "italic",
							}}
						>
							— Synclune
						</Text>
					</Section>

					{/* Footer */}
					<Section
						style={{
							paddingTop: "24px",
							borderTop: `1px solid ${EMAIL_COLORS.border}`,
						}}
					>
						<Text
							style={{
								...EMAIL_STYLES.text.small,
								textAlign: "center",
							}}
						>
							Des questions ? Réponds à cet email ou contacte-moi à{" "}
							<a href="mailto:contact@synclune.fr" style={EMAIL_STYLES.link}>
								contact@synclune.fr
							</a>
						</Text>
						<Text
							style={{
								...EMAIL_STYLES.text.small,
								marginTop: "16px",
								textAlign: "center",
							}}
						>
							Synclune
						</Text>
						<Text
							style={{
								...EMAIL_STYLES.text.tiny,
								marginTop: "8px",
								textAlign: "center",
							}}
						>
							© {new Date().getFullYear()} Synclune - Tous droits réservés
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
	shippingAddress: {
		firstName: "Marie",
		lastName: "Dupont",
		address1: "12 Rue de la Paix",
		address2: "Appartement 4B",
		postalCode: "75002",
		city: "Paris",
		country: "France",
	},
	estimatedDelivery: "3-5 jours ouvrés",
} as TrackingUpdateEmailProps;

export default TrackingUpdateEmail;
