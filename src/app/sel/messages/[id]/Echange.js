import {
  annulerEchange,
  confirmerEchange,
  confirmerRendezVous,
  contesterEchange,
  declarerEchange,
  proposerRendezVous,
} from "@/app/sel/actions/echanges";
import { FormulaireEtape } from "@/app/sel/Formulaires";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import { formatCreneau } from "@/lib/heure-paris";
import { duree, libellesStatutEchange, plancher } from "@/lib/sel/regles";

const Cache = ({ conversationId, echangeId }) => (
  <>
    <input type="hidden" name="conversationId" value={conversationId} />
    {echangeId && <input type="hidden" name="echangeId" value={echangeId} />}
  </>
);

function Annuler({ conversationId, echangeId, libelle = "Annuler l'échange" }) {
  return (
    <details className="sel-annuler">
      <summary className="lien-danger">{libelle}</summary>
      <FormulaireEtape action={annulerEchange} className="formulaire sel-etape-formulaire">
        <Cache conversationId={conversationId} echangeId={echangeId} />
        <input type="text" name="motif" maxLength={500} placeholder="Raison (facultatif)" aria-label="Raison de l'annulation" />
        <BoutonEnvoi className="bouton bouton-danger" enCours="…">Confirmer l'annulation</BoutonEnvoi>
      </FormulaireEtape>
    </details>
  );
}

const montant = (e) => (e.nature === "SERVICE" ? `${duree(e.dureeMinutes)}, soit ${e.briques} briques` : e.briques ? `${e.briques} briques` : "sans briques (prêt ou don)");

// La « petite box » de l'échange : rendez-vous proposé par le bénéficiaire, confirmé par le prestataire,
// puis déclaration du temps passé par le prestataire et confirmation par le bénéficiaire.
export default function Echange({ conversation, echange, suis, autreCode, peutProposer, alias, demain }) {
  const c = conversation.id;
  const presentiel = conversation.annonce.modalite === "PRESENTIEL";

  if (!echange) {
    if (suis !== "beneficiaire") {
      return (
        <section className="sel-etape">
          <h2>Organiser l'échange</h2>
          <p>Quand vous êtes d'accord, {autreCode} vous proposera un rendez-vous ici (date, heure et lieu), que vous pourrez confirmer.</p>
        </section>
      );
    }
    return (
      <section className="sel-etape sel-etape-active">
        <h2>Réserver un rendez-vous</h2>
        {!peutProposer ? (
          <p className="encart">Pour un rendez-vous en personne, révélez d'abord vos identités l'un à l'autre (ci-dessus).</p>
        ) : (
          <FormulaireEtape action={proposerRendezVous} className="formulaire sel-etape-formulaire">
            <Cache conversationId={c} />
            <p className="meta">Vous êtes d'accord avec {autreCode} ? Proposez le créneau : {autreCode} le confirmera.</p>
            <div className="champs">
              <div className="champ">
                <label htmlFor="rdv-date">Date</label>
                <input id="rdv-date" name="date" type="date" required min={demain} />
              </div>
              <div className="champ">
                <label htmlFor="rdv-heure">Heure</label>
                <input id="rdv-heure" name="heure" type="time" required step="300" />
              </div>
              <div className="champ" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="rdv-lieu">Lieu</label>
                <input id="rdv-lieu" name="lieu" type="text" required maxLength={200} defaultValue={presentiel ? "" : "À distance (visio ou téléphone)"} />
              </div>
            </div>
            <div className="actions">
              <BoutonEnvoi>Proposer ce rendez-vous</BoutonEnvoi>
            </div>
          </FormulaireEtape>
        )}
      </section>
    );
  }

  const statut = libellesStatutEchange[echange.statut];
  const creneau = (
    <p>
      📅 <strong>{formatCreneau(echange.creneau)}</strong>
      <br />📍 {echange.lieu}
    </p>
  );

  return (
    <section className={`sel-etape${["PROPOSE", "CONFIRME", "DECLARE"].includes(echange.statut) ? " sel-etape-active" : ""}`}>
      <h2>
        Échange <span className={`badge ${statut.classe}`}>{statut.texte}</span>
      </h2>
      {creneau}

      {echange.statut === "PROPOSE" &&
        (suis === "prestataire" ? (
          <>
            <p>{autreCode} vous propose ce rendez-vous. Il vous convient ?</p>
            <div className="actions">
              <FormulaireEtape action={confirmerRendezVous} className="actions">
                <Cache conversationId={c} echangeId={echange.id} />
                <BoutonEnvoi className="bouton bouton-vert">Confirmer le rendez-vous</BoutonEnvoi>
              </FormulaireEtape>
            </div>
            <Annuler conversationId={c} echangeId={echange.id} libelle="Refuser ce rendez-vous" />
          </>
        ) : (
          <>
            <p className="meta">En attente de la confirmation de {autreCode}.</p>
            <Annuler conversationId={c} echangeId={echange.id} />
          </>
        ))}

      {echange.statut === "CONFIRME" &&
        (suis === "prestataire" ? (
          <>
            <p>
              {new Date(echange.creneau) > new Date()
                ? "Une fois le service rendu, revenez ici pour le déclarer."
                : "Le service a eu lieu ? Indiquez le temps passé : l'échange sera envoyé à " + autreCode + " pour confirmation."}
            </p>
            <FormulaireEtape action={declarerEchange} className="formulaire sel-etape-formulaire">
              <Cache conversationId={c} echangeId={echange.id} />
              {echange.nature === "SERVICE" && (
                <div className="champ">
                  <span className="champ-libelle">Temps passé</span>
                  <div className="sel-duree">
                    <input name="heures" type="number" min="0" max="24" defaultValue="1" aria-label="Heures" /> h
                    <input name="minutes" type="number" min="0" max="59" step="5" defaultValue="0" aria-label="Minutes" /> min
                  </div>
                  <span className="aide">1 minute = 1 brique : {autreCode} vous versera autant de briques que de minutes.</span>
                </div>
              )}
              {echange.nature === "OBJET" && (
                <div className="champ">
                  <label htmlFor="valeur">Valeur convenue (briques)</label>
                  <input id="valeur" name="valeur" type="number" min="0" max="1440" required defaultValue={conversation.annonce.valeurBriques ?? 0} />
                </div>
              )}
              <fieldset className="sel-oui-non">
                <legend>Tout s'est bien passé ?</legend>
                <label className="case"><input type="radio" name="bienPasse" value="oui" required defaultChecked /> <span>Oui</span></label>
                <label className="case"><input type="radio" name="bienPasse" value="non" /> <span>Non, il y a eu un souci</span></label>
              </fieldset>
              <div className="champ">
                <label htmlFor="commentaire">Un mot (facultatif)</label>
                <input id="commentaire" name="commentaire" type="text" maxLength={1000} />
              </div>
              <div className="actions">
                <BoutonEnvoi>Déclarer l'échange réalisé</BoutonEnvoi>
              </div>
            </FormulaireEtape>
            <Annuler conversationId={c} echangeId={echange.id} />
          </>
        ) : (
          <>
            <p className="meta">Rendez-vous confirmé. Après le service, {autreCode} déclarera le temps passé, puis vous confirmerez.</p>
            <Annuler conversationId={c} echangeId={echange.id} />
          </>
        ))}

      {echange.statut === "DECLARE" &&
        (suis === "beneficiaire" ? (
          <>
            <p>
              {autreCode} déclare : <strong>{montant(echange)}</strong>. Tout s'est bien passé : {echange.bienPasse ? "oui" : "non"}.
              {echange.commentaire && <><br />« {echange.commentaire} »</>}
            </p>
            {echange.briques > 0 && (
              <p className="meta">
                Votre solde passera de {alias.soldeBriques} à {alias.soldeBriques - echange.briques} briques (minimum autorisé : {plancher(alias)}).
              </p>
            )}
            <FormulaireEtape action={confirmerEchange} className="formulaire sel-etape-formulaire">
              <Cache conversationId={c} echangeId={echange.id} />
              <div className="champ">
                <label htmlFor="avis">Votre avis (facultatif)</label>
                <input id="avis" name="avis" type="text" maxLength={1000} placeholder="Merci pour ce coup de main !" />
              </div>
              <div className="actions">
                <BoutonEnvoi className="bouton bouton-vert">Confirmer{echange.briques ? ` et verser ${echange.briques} briques` : ""}</BoutonEnvoi>
              </div>
            </FormulaireEtape>
            <details className="sel-annuler">
              <summary className="lien-danger">Je ne suis pas d'accord</summary>
              <FormulaireEtape action={contesterEchange} className="formulaire sel-etape-formulaire">
                <Cache conversationId={c} echangeId={echange.id} />
                <textarea name="motif" required minLength={10} maxLength={1000} rows={3} aria-label="Ce qui ne va pas" placeholder="Expliquez ce qui ne va pas : l'association vous proposera une médiation." />
                <BoutonEnvoi className="bouton bouton-danger">Contester</BoutonEnvoi>
              </FormulaireEtape>
            </details>
          </>
        ) : (
          <p className="meta">Vous avez déclaré : {montant(echange)}. En attente de la confirmation de {autreCode}.</p>
        ))}

      {echange.statut === "TERMINE" && (
        <p>
          ✅ Échange terminé : {montant(echange)}
          {echange.avisBeneficiaire && <><br />Avis : « {echange.avisBeneficiaire} »</>}
        </p>
      )}
      {echange.statut === "LITIGE" && <p className="encart">Ce désaccord a été transmis à l'association, qui proposera une médiation.</p>}
    </section>
  );
}
