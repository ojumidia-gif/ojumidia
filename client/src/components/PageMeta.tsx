import { useEffect } from "react";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let node = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attr, key);
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
}

export function PageMeta({
  title,
  description,
  image,
  url,
}: {
  title: string;
  description: string;
  image?: string | null;
  url?: string;
}) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", "article");
    if (url) upsertMeta("property", "og:url", url);
    if (image) {
      upsertMeta("property", "og:image", image);
      upsertMeta("name", "twitter:card", "summary_large_image");
    }
    return () => { document.title = previous; };
  }, [title, description, image, url]);
  return null;
}
