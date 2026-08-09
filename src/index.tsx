/* @refresh reload */
import { render } from "solid-js/web";
import "./styles/globals.css";
import App from "./App";
import { initBirds, prefetchWorldBirds } from "./lib/birdStore";
import { startAutoSync } from "./lib/offlineSync";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

render(() => <App />, root);

initBirds();
prefetchWorldBirds();
startAutoSync();
