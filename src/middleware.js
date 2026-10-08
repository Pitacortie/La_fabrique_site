import { NextResponse } from "next/server";

// Premier filtre rapide : sans cookie de session, inutile d'aller plus loin.
// La vérification complète (session valide, compte actif, rôle) est faite côté serveur (src/lib/auth.js).
export function middleware(request) {
  if (!request.cookies.has("fabrique_session")) {
    const url = new URL("/connexion", request.url);
    url.searchParams.set("suite", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/espace/:path*", "/admin/:path*"],
};
