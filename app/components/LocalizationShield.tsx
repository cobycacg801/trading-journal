"use client";
import { useEffect } from "react";

/**
 * LocalizationShield
 * - Catches & suppresses the specific RegisterClientLocalizationsError
 *   that is currently thrown during app bootstrap so it doesn't prevent
 *   the rest of the app (including client charts) from mounting.
 *
 * This is a temporary safety-net. We still need to fix the root cause later.
 */
export default function LocalizationShield() {
  useEffect(() => {
    function handler(e: PromiseRejectionEvent) {
      try {
        const reason = (e && (e as any).reason) ?? null;
        const name = reason?.name ?? reason?.message ?? "";

        // If the promise rejection is the RegisterClientLocalizationsError,
        // prevent default (stops it being an uncaught exception) and log it.
        if (typeof name === "string" && name.includes("RegisterClientLocalizationsError")) {
          console.warn("Suppressed RegisterClientLocalizationsError (temporary):", reason);
          // prevent browser from treating it as uncaught
          e.preventDefault();
        }
      } catch (err) {
        // if anything goes wrong here, don't crash the page
        console.error("LocalizationShield handler error:", err);
      }
    }

    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return null;
}
