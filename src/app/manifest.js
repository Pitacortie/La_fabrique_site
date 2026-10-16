// « Ajouter à l'écran d'accueil » : le site s'ouvre en plein écran, avec son icône, comme une application.
export default function manifest() {
  return {
    name: "La Fabrique de Ménesplet",
    short_name: "La Fabrique",
    description: "Association participative et citoyenne de Ménesplet : actualités, agenda, gazette et SEL.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6ef",
    theme_color: "#3b7a96",
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icones/icone-masquable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Le SEL", url: "/sel" },
      { name: "Agenda", url: "/agenda" },
      { name: "Mon espace", url: "/espace" },
    ],
  };
}
