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
						<Text style={EMAIL_STYLES.heading.h2}>Confirmation</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
							Clique sur le bouton pour confirmer ton inscription à la
							newsletter.
						</Text>
					</Section>

					{/* CTA */}
					<Section style={{ marginBottom: "24px", textAlign: "center" }}>
						<Button href={confirmationUrl} style={EMAIL_STYLES.button.primary}>
							Confirmer
						</Button>
					</Section>

					{/* Info */}
					<Section style={{ ...EMAIL_STYLES.section.card, marginBottom: "32px" }}>
						<Text style={EMAIL_STYLES.text.small}>
							Ce lien expire dans 7 jours.
						</Text>
					</Section>

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

NewsletterConfirmationEmail.PreviewProps = {
	confirmationUrl: "https://synclune.fr/newsletter/confirm?token=example123",
} as NewsletterConfirmationEmailProps;

export default NewsletterConfirmationEmail;
