import { Button, Section, Text } from "@react-email/components";
import { EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";

interface NewsletterWelcomeEmailProps {
	email: string;
	unsubscribeUrl: string;
	shopUrl: string;
}

export const NewsletterWelcomeEmail = ({
	email,
	unsubscribeUrl,
	shopUrl,
}: NewsletterWelcomeEmailProps) => {
	return (
		<EmailLayout
			preview="Bienvenue"
			footer={
				<>
					<Text style={EMAIL_STYLES.text.tiny}>
						Synclune - Bijoux artisanaux
					</Text>
					<Text style={EMAIL_STYLES.text.tiny}>
						<a
							href={unsubscribeUrl}
							style={{ ...EMAIL_STYLES.link, textDecoration: "underline" }}
						>
							Se désinscrire
						</a>
					</Text>
				</>
			}
		>
			{/* Titre */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.heading.h2}>Bienvenue</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
					Vous êtes inscrit à la newsletter avec {email}.
				</Text>
			</Section>

			{/* CTA */}
			<Section style={{ marginBottom: "32px", textAlign: "center" }}>
				<Button
					href={shopUrl}
					style={EMAIL_STYLES.button.primary}
				>
					Voir les créations
				</Button>
			</Section>
		</EmailLayout>
	);
};

NewsletterWelcomeEmail.PreviewProps = {
	email: "example@email.com",
	unsubscribeUrl: "https://synclune.fr/newsletter/unsubscribe?token=abc123",
	shopUrl: "https://synclune.fr/produits",
} as NewsletterWelcomeEmailProps;

export default NewsletterWelcomeEmail;
