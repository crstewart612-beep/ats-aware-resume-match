import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // One client per request: a module-level QueryClient leaks cached data between SSR requests.
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Lets Query own freshness; set caching defaults on the QueryClient, not the router.
    defaultPreloadStaleTime: 0,
  });

  return router;
};

// A page left open across an update can ask for files that no longer exist.
// Reload once to pick up the new version instead of showing a blank screen.
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    if (sessionStorage.getItem("rm_reloaded")) return;
    event.preventDefault();
    sessionStorage.setItem("rm_reloaded", "1");
    window.location.reload();
  });
  window.addEventListener("load", () =>
    setTimeout(() => {
      sessionStorage.removeItem("rm_reloaded");
      sessionStorage.removeItem("rm_load_retries");
    }, 10000),
  );
}
