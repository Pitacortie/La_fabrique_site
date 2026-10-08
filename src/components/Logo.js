// Logo provisoire (le logo définitif est en cours de création, annexe E.5).
export default function Logo({ taille = 40 }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14" fill="#FAF6EF" />
      <circle cx="32" cy="24" r="13" fill="#3D6B4A" />
      <rect x="30" y="30" width="4" height="12" fill="#2B2620" />
      <path d="M6 46c8-6 14 6 26 0s18 6 26 0v10H6z" fill="#3B7A96" />
    </svg>
  );
}
