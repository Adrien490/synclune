import { Button, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";

interface NewsletterEmailProps {
	subject: string;
	content: string;
	unsubscribeUrl: string;
}

export const NewsletterEmail = ({
	subject,
	content,
	unsubscribeUrl,
}: NewsletterEmailProps) => {
	return (
		<EmailLayout
			preview={subject}
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
				<Text style={EMAIL_STYLES.heading.h2}>{subject}</Text>
			</Section>

			{/* Contenu */}
			<Section style={{ marginBottom: "24px" }}>
				<Text
					style={{
						margin: 0,
						fontSize: "16px",
						lineHeight: "1.7",
						color: EMAIL_COLORS.text.primary,
						whiteSpace: "pre-line",
					}}
				>
					{content}
				</Text>
			</Section>

			{/* CTA */}
			<Section style={{ marginBottom: "32px", textAlign: "center" }}>
				<Button
					href="https://synclune.fr/produits"
					style={EMAIL_STYLES.button.primary}
				>
					Voir les créations
				</Button>
			</Section>
		</EmailLayout>
	);
};

NewsletterEmail.PreviewProps = {
	subject: "Nouvelles créations",
	content:
		"Bonjour,\n\nJ'ai le plaisir de vous présenter mes dernières créations.",
	unsubscribeUrl: "https://synclune.fr/newsletter/unsubscribe",
} as NewsletterEmailProps;

export default NewsletterEmail;
