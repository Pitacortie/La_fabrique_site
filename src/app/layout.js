import { Antonio, Montserrat } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

// next/font télécharge les polices au build et les sert depuis le site :
// aucun appel à Google Fonts depuis le navigateur des visiteurs (section 11.3).
const antonio = Antonio({ subsets: ["latin"], variable: "--font-antonio", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" });

export const metadata = {
  title: { default: site.nom, template: `%s · ${site.nom}` },
  description: `${site.nom} : ${site.accroche.toLowerCase()}. Vie locale, entraide et initiatives habitantes.`,
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${antonio.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
