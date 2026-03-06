import { Button, Link, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";

interface NewsletterWelcomeEmailProps {
	email: string;
	unsubscribeUrl: string;
	shopUrl: string;
	promoCode?: string;
}

export const NewsletterWelcomeEmail = ({
	email,
	unsubscribeUrl,
	shopUrl,
	promoCode,
}: NewsletterWelcomeEmailProps) => {
	return (
		<EmailLayout
			preview={promoCode ? `Bienvenue — Votre code -10% : ${promoCode}` : "Bienvenue"}
			footer={
				<>
					<Text style={EMAIL_STYLES.text.tiny}>Synclune - Bijoux artisanaux</Text>
					<Text style={EMAIL_STYLES.text.tiny}>
						<Link
							href={unsubscribeUrl}
							style={{ ...EMAIL_STYLES.link, textDecoration: "underline" }}
						>
							Se désinscrire
						</Link>
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

			{/* Promo code */}
			{promoCode && (
				<Section
					style={{
						marginBottom: "24px",
						padding: "24px",
						backgroundColor: EMAIL_COLORS.background.card,
						borderRadius: "8px",
						textAlign: "center",
					}}
				>
					<Text style={{ ...EMAIL_STYLES.text.body, fontWeight: "600", marginBottom: "8px" }}>
						Pour vous remercier, profitez de -10% sur votre première commande :
					</Text>
					<Text
						style={{
							margin: "12px 0",
							fontSize: "28px",
							fontWeight: "bold",
							color: EMAIL_COLORS.primary,
							letterSpacing: "2px",
						}}
					>
						{promoCode}
					</Text>
					<Text style={EMAIL_STYLES.text.small}>
						Utilisez ce code au moment du paiement. Valable 30 jours, une seule utilisation.
					</Text>
				</Section>
			)}

			{/* CTA */}
			<Section style={{ marginBottom: "32px", textAlign: "center" }}>
				<Button href={shopUrl} style={EMAIL_STYLES.button.primary}>
					{promoCode ? "Profiter de -10%" : "Voir les créations"}
				</Button>
			</Section>
		</EmailLayout>
	);
};

NewsletterWelcomeEmail.PreviewProps = {
	email: "example@email.com",
	unsubscribeUrl: "https://synclune.fr/newsletter/unsubscribe?token=abc123",
	shopUrl: "https://synclune.fr/produits",
	promoCode: "BIENVENUE-A1B2C3",
} as NewsletterWelcomeEmailProps;

export default NewsletterWelcomeEmail;
