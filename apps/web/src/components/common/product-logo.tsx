// The HelpDesk Pro product mark (distinct from a tenant's own uploaded
// company logo, which BrandLogo renders) - a support ring with a resolved
// checkmark. Mirrors public/favicon.svg so the browser tab and the in-app
// chip/footer uses are the same shape.
export function ProductLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="currentColor" fillOpacity="0.16" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth="2.75" />
      <path d="M11.5 16.3l2.9 2.9 6.1-6.4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
