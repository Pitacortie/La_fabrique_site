import Link from "next/link";
import { exigerPublication } from "@/lib/auth";
import FormulaireArticle from "../FormulaireArticle";

export default async function NouvelArticle() {
  await exigerPublication();
  return (
    <>
      <p><Link href="/admin/articles">← Tous les articles</Link></p>
      <div className="coque-entete">
        <h1>Nouvel article</h1>
      </div>
      <FormulaireArticle />
    </>
  );
}
