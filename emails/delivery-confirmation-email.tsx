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

interface DeliveryConfirmationEmailProps {
	orderNumber: string;
	customerName: string;
	deliveryDate: string;
	orderDetailsUrl: string;
}

export const DeliveryConfirmationEmail = ({
	orderNumber,
	customerName,
	deliveryDate,
	orderDetailsUrl,
}: DeliveryConfirmationEmailProps) => {
	return (
		<Html>
			<Head />
			<Preview>Ta commande {orderNumber} a été livrée !</Preview>
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
							✅
						</Text>
						<Text
							style={{
								...EMAIL_STYLES.heading.h2,
								marginTop: "16px",
							}}
						>
							Ta commande a été livrée !
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "16px" }}>
							Bonjour {customerName},
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "8px" }}>
							Super nouvelle ! Ta commande vient d'être livrée. J'espère que tes
							créations te plairont !
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

					{/* Date de livraison */}
					<Section
						style={{
							...EMAIL_STYLES.section.highlighted,
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
							Date de livraison
						</Text>
						<Text
							style={{
								margin: "8px 0 0 0",
								fontSize: "18px",
								fontWeight: "bold",
								color: EMAIL_COLORS.states.success,
							}}
						>
							{deliveryDate}
						</Text>
					</Section>

					{/* CTA Voir commande */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Button href={orderDetailsUrl} style={EMAIL_STYLES.button.primary}>
							Voir ma commande
						</Button>
					</Section>

					<Hr style={EMAIL_STYLES.hr} />

					{/* Message satisfaction */}
					<Section
						style={{
							...EMAIL_STYLES.section.highlighted,
							marginBottom: "24px",
						}}
					>
						<Text
							style={{
								margin: 0,
								fontSize: "14px",
								fontWeight: "600",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							💬 Ton avis compte !
						</Text>
						<Text
							style={{
								...EMAIL_STYLES.text.small,
								marginTop: "8px",
							}}
						>
							J'adorerais savoir ce que tu penses de ta commande. N'hésite pas à
							me contacter pour me faire part de tes impressions ou à partager
							tes créations sur les réseaux sociaux avec #Synclune !
						</Text>
					</Section>

					{/* Conseils d'entretien */}
					<Section
						style={{
							...EMAIL_STYLES.section.card,
							marginBottom: "24px",
						}}
					>
						<Text
							style={{
								margin: 0,
								fontSize: "14px",
								fontWeight: "600",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							✨ Conseils d'entretien
						</Text>
						<Text
							style={{
								...EMAIL_STYLES.text.small,
								marginTop: "8px",
							}}
						>
							• Évite le contact avec l'eau, les parfums et les produits
							cosmétiques.
						</Text>
						<Text style={EMAIL_STYLES.text.small}>
							• Range tes bijoux à l'abri de l'humidité et de la lumière
							directe.
						</Text>
						<Text style={EMAIL_STYLES.text.small}>
							• Nettoie délicatement avec un chiffon doux si besoin.
						</Text>
					</Section>

					{/* Message personnel */}
					<Section style={{ marginBottom: "24px", textAlign: "center" }}>
						<Text style={EMAIL_STYLES.text.body}>
							Merci infiniment pour ta confiance !
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
							Un problème avec ta commande ? Réponds à cet email ou contacte-moi
							à{" "}
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

DeliveryConfirmationEmail.PreviewProps = {
	orderNumber: "CMD-1730000000-ABCD",
	customerName: "Marie",
	deliveryDate: "27 novembre 2025",
	orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-1730000000-ABCD",
} as DeliveryConfirmationEmailProps;

export default DeliveryConfirmationEmail;
