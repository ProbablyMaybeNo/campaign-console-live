import { useEffect } from "react";

/**
 * Injects a <meta name="robots" content="noindex, nofollow"> tag
 * into the document head while the component is mounted.
 * Removes it on unmount so public pages remain indexable.
 */
export function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);

    return () => {
      document.head.removeChild(meta);
    };
  }, []);
}
