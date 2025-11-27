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

interface NewsletterConfirmationEmailProps {
	confirmationUrl: string;
}

export const NewsletterConfirmationEmail = ({
	confirmationUrl,
}: NewsletterConfirmationEmailProps) => {
	return (
		<Html>
			<Head />
			<Preview>Confirme ton inscription</Preview>
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

					{/* Titre */}
					<Section style={{ marginBottom: "24px" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "20px",
								fontWeight: "600",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							Confirme ton inscription
						</Text>
					</Section>

					{/* Message */}
					<Section style={{ marginBottom: "32px" }}>
						<Text style={EMAIL_STYLES.text.body}>
							Merci pour ton inscription !
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "16px" }}>
							Pour recevoir les créations en avant-première et les offres
							exclusives, confirme ton adresse email en cliquant sur le
							bouton ci-dessous.
						</Text>
					</Section>

					{/* CTA */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Button
							href={confirmationUrl}
							style={EMAIL_STYLES.button.primary}
						>
							Confirmer mon inscription
						</Button>
					</Section>

					{/* Info */}
					<Section style={{ marginBottom: "24px" }}>
						<Text style={{ ...EMAIL_STYLES.text.small, lineHeight: "1.6" }}>
							Ce lien est valable pendant 7 jours. Si tu n'as pas demandé
							cette inscription, tu peux ignorer cet email.
						</Text>
					</Section>

					{/* Avantages */}
					<Section style={{ ...EMAIL_STYLES.section.card, marginBottom: "24px" }}>
						<Text
							style={{
								margin: 0,
								marginBottom: "12px",
								fontSize: "14px",
								fontWeight: "500",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							Ce que tu recevras :
						</Text>
						<ul
							style={{
								color: EMAIL_COLORS.text.primary,
								fontSize: "14px",
								lineHeight: "1.8",
								margin: 0,
								paddingLeft: "20px",
							}}
						>
							<li>Les nouvelles créations en avant-première</li>
							<li>Des offres exclusives</li>
							<li>Les coulisses de l'atelier</li>
						</ul>
					</Section>

					{/* Footer */}
					<Section
						style={{
							paddingTop: "24px",
							borderTop: `1px solid ${EMAIL_COLORS.border}`,
							textAlign: "center",
						}}
					>
						<Text style={EMAIL_STYLES.text.small}>
							Synclune
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.tiny, marginTop: "8px" }}>
							© {new Date().getFullYear()} Synclune - Tous droits réservés
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
};

NewsletterConfirmationEmail.PreviewProps = {
	confirmationUrl: "https://synclune.fr/newsletter/confirm?token=example123",
} as NewsletterConfirmationEmailProps;

export default NewsletterConfirmationEmail;
