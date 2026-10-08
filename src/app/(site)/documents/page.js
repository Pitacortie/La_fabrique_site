import { formatDate } from "@/lib/format";
import { libellesTypeTexte } from "@/lib/site";
import { getTextesEnVigueur } from "@/lib/textes";

export const metadata = { title: "Statuts, règlement et charte" };

const TYPES = ["STATUTS", "REGLEMENT_INTERIEUR", "CHARTE_NEUTRALITE"];

// PRE-5 : textes en vigueur, consultables en ligne (version et date gérées dans la console, ADM-11).
export default async function Documents() {
  const textes = await getTextesEnVigueur(TYPES);

  return (
    <div className="conteneur section">
      <h1>Nos textes</h1>
      <p className="chapo">Ces trois textes encadrent la vie de l'association. Leur acceptation est obligatoire pour adhérer.</p>
      <div className="pile">
        {TYPES.map((type) => {
          const t = textes[type];
          return (
            <details key={type} className="carte carte-bleu">
              <summary>
                <strong>{t?.titre ?? libellesTypeTexte[type]}</strong>
                <span className="meta">
                  {t ? ` · version ${t.version}, en vigueur depuis le ${formatDate(t.enVigueurLe)}` : " · bientôt disponible"}
                </span>
              </summary>
              {t && <pre className="texte-legal texte-complet">{t.contenu}</pre>}
            </details>
          );
        })}
      </div>
    </div>
  );
}
