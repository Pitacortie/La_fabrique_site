import Footer from "@/components/Footer";
import Header from "@/components/Header";
import BarreEdition from "@/components/edition/BarreEdition";
import { ROLES_ADMIN, getMembreConnecte } from "@/lib/auth";

export default async function SiteLayout({ children }) {
  const membre = await getMembreConnecte();
  return (
    <>
      <a href="#contenu" className="skip-link">Aller au contenu</a>
      <Header connecte={!!membre} />
      <main id="contenu">{children}</main>
      <Footer />
      {membre && ROLES_ADMIN.includes(membre.role) && <BarreEdition />}
    </>
  );
}
