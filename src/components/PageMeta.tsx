import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

interface PageMetaProps {
  title: string;
  description: string;
}

export function PageMeta({ title, description }: PageMetaProps) {
  const { pathname } = useLocation();
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://www.gmestetica.bond";
  const canonical = `${origin}${pathname}`;

  const safeTitle = title.length > 60 ? title.slice(0, 57) + "…" : title;
  const safeDesc =
    description.length > 160 ? description.slice(0, 157) + "…" : description;

  return (
    <Helmet>
      <title>{safeTitle}</title>
      <meta name="description" content={safeDesc} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={safeTitle} />
      <meta property="og:description" content={safeDesc} />
      <meta property="og:url" content={canonical} />
      <meta name="twitter:title" content={safeTitle} />
      <meta name="twitter:description" content={safeDesc} />
    </Helmet>
  );
}
