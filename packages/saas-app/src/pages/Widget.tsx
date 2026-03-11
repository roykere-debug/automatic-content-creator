import { useEffect } from "react";

/**
 * Minimal transparent page for embedding the chatbot widget in WordPress (or any site) via iframe.
 * The ChatWidget component is rendered globally in App.tsx and floats over this page.
 *
 * WordPress embedding:
 *   <script src="https://YOUR-APP-URL/embed.js"></script>
 *   OR via iframe — see README.
 */
export default function Widget() {
  useEffect(() => {
    // Make the page background transparent so it works as an iframe overlay
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
      document.body.style.overflow = "";
    };
  }, []);

  // ChatWidget is already rendered globally in App.tsx
  return null;
}
