import Link from "next/link";
import { retirerArticle } from "@/app/admin/articles/actions";
import BoutonEnvoi from "@/components/BoutonEnvoi";

// Mode édition : modifier ou retirer une actualité directement depuis la page publique
export default function OutilsArticle({ id }) {
  return (
    <div className="outils-article crayon-lien">
      <Link href={`/admin/articles/${id}`} className="bouton bouton-secondaire">✏️ Modifier</Link>
      <form action={retirerArticle}>
        <input type="hidden" name="id" value={id} />
        <BoutonEnvoi className="bouton bouton-secondaire bouton-retirer" enCours="Retrait…">Retirer du site</BoutonEnvoi>
      </form>
    </div>
  );
}
