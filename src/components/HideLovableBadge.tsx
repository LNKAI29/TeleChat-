import { useEffect } from "react";

/**
 * Removes the injected "Edit with Lovable" badge from published deployments
 * as soon as it appears, so end users never see it.
 */
export function HideLovableBadge() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const isBadge = (el: Element) => {
      const id = (el.id || "").toLowerCase();
      const cls = (typeof el.className === "string" ? el.className : "").toLowerCase();
      if (id.includes("lovable") || cls.includes("lovable")) return true;
      if (el instanceof HTMLAnchorElement) {
        const href = (el.getAttribute("href") || "").toLowerCase();
        const text = (el.textContent || "").toLowerCase();
        if (
          href.includes("lovable.dev") &&
          (text.includes("edit with lovable") || text.includes("build with lovable"))
        ) {
          return true;
        }
      }
      return false;
    };

    const sweep = () => {
      document
        .querySelectorAll<HTMLElement>(
          "[id*='lovable' i],[class*='lovable' i],a[href*='lovable.dev' i]",
        )
        .forEach((el) => {
          if (isBadge(el)) el.remove();
        });
    };

    sweep();
    const observer = new MutationObserver(sweep);
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setInterval(sweep, 500);
    const stop = window.setTimeout(() => window.clearInterval(timer), 15000);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      window.clearTimeout(stop);
    };
  }, []);

  return null;
}