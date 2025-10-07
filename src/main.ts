import "./style.css";

import { bootstrapApp } from "./app";

const appContainer = document.querySelector<HTMLElement>("#app");

if (!appContainer) {
  throw new Error(
    "App container not found. Ensure index.html has #app element."
  );
}

bootstrapApp({ container: appContainer }).catch((error) => {
  console.error("Failed to bootstrap application", error);
});
