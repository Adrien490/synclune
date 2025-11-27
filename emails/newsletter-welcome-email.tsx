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

interface NewsletterWelcomeEmailProps {
	email: string;
}

export const NewsletterWelcomeEmail = ({
	email,
}: NewsletterWelcomeEmailProps) => {
	return (
		<Html>
			<Head />
			<Preview>Bienvenue !</Preview>
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
					<Section style={{ marginBottom: "24px", textAlign: "center" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "24px",
								fontWeight: "600",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							Bienvenue !
						</Text>
					</Section>

					{/* CTA */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Button
							href="https://synclune.fr/produits"
							style={EMAIL_STYLES.button.primary}
						>
							Voir les bijoux
						</Button>
					</Section>

					{/* Réassurance */}
					<Section
						style={{ ...EMAIL_STYLES.section.card, marginBottom: "24px" }}
					>
						<Text
							style={{
								...EMAIL_STYLES.text.small,
								textAlign: "center",
							}}
						>
							Vous recevrez la newsletter 1 à 2 fois par mois.
						</Text>
						<Text
							style={{
								...EMAIL_STYLES.text.small,
								marginTop: "8px",
								textAlign: "center",
							}}
						>
							Vos données sont protégées et ne seront jamais partagées.
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
						<Text style={EMAIL_STYLES.text.small}>Synclune</Text>
						<Text style={{ ...EMAIL_STYLES.text.tiny, marginTop: "8px" }}>
							© {new Date().getFullYear()} Synclune - Tous droits réservés
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.tiny, marginTop: "16px" }}>
							Inscrit depuis {email}
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
};

NewsletterWelcomeEmail.PreviewProps = {
	email: "example@email.com",
} as NewsletterWelcomeEmailProps;

export default NewsletterWelcomeEmail;
