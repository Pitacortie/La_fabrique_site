"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { fr } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { formaterSaisieDate, formaterSaisieHeure, frVersIso, heureValide, isoVersFr } from "@/lib/date-fr";

const versIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const versDate = (iso) => (iso ? new Date(`${iso}T12:00:00`) : undefined);

// Champ date au format jj/mm/aaaa : on tape la date au clavier, ou on la choisit dans le calendrier (📅).
// (Le champ natif suit la langue du navigateur, parfois américaine : on ne l'utilise pas.)
// Le formulaire envoie, sous `name`, la date au format aaaa-mm-jj attendu par le serveur.
// `naissance` : calendrier qui s'ouvre une trentaine d'années en arrière, années jusqu'à 1920.
export function ChampDate({ name, defaultValue = "", min, max, onChange, required, naissance = false, id, ...attributs }) {
  const [texte, setTexte] = useState(isoVersFr(defaultValue));
  const [ouvert, setOuvert] = useState(false);
  const champRef = useRef(null);
  const boutonRef = useRef(null);
  const conteneurRef = useRef(null);
  const iso = frVersIso(texte);

  useEffect(() => {
    let erreur = "";
    if (texte && !iso) erreur = "Date invalide : écrivez-la au format jj/mm/aaaa.";
    else if (iso && min && iso < min) erreur = `La date doit être au plus tôt le ${isoVersFr(min)}.`;
    else if (iso && max && iso > max) erreur = `La date doit être au plus tard le ${isoVersFr(max)}.`;
    champRef.current?.setCustomValidity(erreur);
  }, [texte, iso, min, max]);

  useEffect(() => {
    onChange?.(iso ?? "");
  }, [iso]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fermeture du calendrier : clic à l'extérieur ou touche Échap
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e) => !conteneurRef.current?.contains(e.target) && setOuvert(false);
    const touche = (e) => {
      if (e.key === "Escape") {
        setOuvert(false);
        boutonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", touche);
    };
  }, [ouvert]);

  const annee = new Date().getFullYear();
  const selection = versDate(iso);
  const bornes = naissance
    ? { startMonth: new Date(1920, 0), endMonth: new Date(), defaultMonth: selection ?? new Date(annee - 30, 0) }
    : { startMonth: new Date(annee - 5, 0), endMonth: new Date(annee + 10, 11), defaultMonth: selection ?? versDate(min) ?? new Date() };
  const interdits = [min && { before: versDate(min) }, max && { after: versDate(max) }, naissance && { after: new Date() }].filter(Boolean);

  return (
    <div className="champ-date" ref={conteneurRef}>
      <input
        ref={champRef}
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="jj/mm/aaaa"
        maxLength={10}
        value={texte}
        onChange={(e) => setTexte(formaterSaisieDate(e.target.value))}
        required={required}
        {...attributs}
      />
      <button
        ref={boutonRef}
        type="button"
        className="champ-date-bouton"
        onClick={() => setOuvert((o) => !o)}
        aria-label="Choisir la date dans un calendrier"
        aria-expanded={ouvert}
        title="Choisir dans le calendrier"
      >
        📅
      </button>
      {ouvert && (
        <div className="champ-date-calendrier" role="dialog" aria-label="Calendrier">
          <DayPicker
            mode="single"
            locale={fr}
            captionLayout="dropdown"
            reverseYears={naissance}
            selected={selection}
            disabled={interdits}
            autoFocus
            {...bornes}
            onSelect={(jour) => {
              if (jour) setTexte(isoVersFr(versIso(jour)));
              setOuvert(false);
              champRef.current?.focus();
            }}
          />
        </div>
      )}
      <input type="hidden" name={name} value={iso ?? ""} />
    </div>
  );
}

// Champ heure au format 24 h (hh:mm), sans AM/PM quelle que soit la langue du navigateur.
export function ChampHeure({ name, defaultValue = "", required, ...attributs }) {
  const [texte, setTexte] = useState(defaultValue);
  const ref = useRef(null);
  const heure = heureValide(texte);

  useEffect(() => {
    ref.current?.setCustomValidity(texte && !heure ? "Heure invalide : écrivez-la au format hh:mm (par exemple 14:30)." : "");
  }, [texte, heure]);

  return (
    <>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        placeholder="hh:mm"
        maxLength={5}
        value={texte}
        onChange={(e) => setTexte(formaterSaisieHeure(e.target.value))}
        required={required}
        {...attributs}
      />
      <input type="hidden" name={name} value={heure ?? ""} />
    </>
  );
}
