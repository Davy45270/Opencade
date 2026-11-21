#!/usr/bin/env node
// « Reuse before build » (BB-001 § 5, BB-08) dans la CI d'un jeu, en AVERTISSEMENT : jamais bloquant pour l'instant.
// Briques NOUVELLES entre la base et HEAD, avec les clés de `bbctl gate` (npm : version du package-lock ; Docker : image
// des FROM ; module local : src/engines/<x> ou packages/<x>). Couvertes si décidées au catalogue de l'usine ou si une
// dérogation `HL-n 7-n` existe (.woodpecker/usine/briques.json, écrit par l'usine). Rapport : reutilisation-rapport.json.
// usage : node .woodpecker/usine/reutilisation.mjs [--base <réf>]   (défaut : merge-base avec origin/<cible> sur une PR,
// puis CI_PREV_COMMIT_SHA, puis HEAD~1 ; base absente du clone = statut « base-indisponible », jamais d’échec)
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const RAPPORT = "reutilisation-rapport.json";
const REF = /^HL-[0-9]+ 7-[0-9]+$/;
const LOCAL_ROOTS = [["src", "engines"], ["packages"]];

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
}

function ecrire(rapport) {
  writeFileSync(RAPPORT, JSON.stringify(rapport, null, 1) + "\n");
  console.log(`réutilisation (avertissement) : ${rapport.status}`);
  for (const k of rapport.uncovered || []) console.log(`  ⚠ brique nouvelle sans recherche documentée : ${k}`);
  console.log(`--- ${RAPPORT} ---\n${JSON.stringify(rapport)}`);
  process.exit(0);
}

function revision(ref) {
  try {
    return git("rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`).trim();
  } catch {
    return null;
  }
}

function lireJson(commit, chemin) {
  try {
    return JSON.parse(git("cat-file", "-p", `${commit}:${chemin}`));
  } catch {
    return null;
  }
}

function cles(commit, repo) {
  const chemins = git("ls-tree", "-r", "--name-only", commit).split("\n").filter(Boolean);
  const out = new Set();
  for (const chemin of chemins) {
    const parts = chemin.split("/");
    const nom = parts[parts.length - 1];
    if (nom === "package.json" && !parts.includes("node_modules")) {
      const manifeste = lireJson(commit, chemin);
      if (!manifeste || typeof manifeste !== "object") continue;
      const voisin = parts.slice(0, -1).concat("package-lock.json").join("/");
      const lock = lireJson(commit, voisin) || lireJson(commit, "package-lock.json") || {};
      const paquets = lock.packages && typeof lock.packages === "object" ? lock.packages : {};
      const lies = new Set(Object.entries(paquets).filter(([, e]) => e && e.link).map(([k]) => k.replace(/^node_modules\//, "")));
      for (const section of ["dependencies", "devDependencies"]) {
        for (const dep of Object.keys(manifeste[section] || {})) {
          if (lies.has(dep)) continue;
          const v = (paquets[`node_modules/${dep}`] || {}).version;
          out.add(`npm:${dep}@${typeof v === "string" ? v : "unresolved"}`);
        }
      }
    } else if (nom.startsWith("Dockerfile")) {
      const etapes = new Set();
      for (const ligne of git("cat-file", "-p", `${commit}:${chemin}`).split("\n")) {
        const mots = ligne.trim().split(/\s+/);
        if (mots.length < 2 || mots[0].toUpperCase() !== "FROM") continue;
        const image = mots.slice(1).find((m) => !m.startsWith("--")) || "";
        if (mots.length >= 4 && mots[mots.length - 2].toUpperCase() === "AS") etapes.add(mots[mots.length - 1].toLowerCase());
        if (!image || etapes.has(image.toLowerCase()) || image.includes("$")) continue;
        const sansDigest = image.split("@")[0];
        const dernier = image.split("/").pop();
        let nomImage = image, tag = "";
        if (dernier.includes(":")) {
          const i = sansDigest.lastIndexOf(":");
          nomImage = sansDigest.slice(0, i);
          tag = sansDigest.slice(i + 1);
        }
        out.add(`docker:${nomImage || image}@${tag || "unresolved"}`);
      }
    }
    for (const racine of LOCAL_ROOTS) {
      if (parts.length > racine.length + 1 && racine.every((r, i) => parts[i] === r)) {
        out.add(`local:${repo}:${parts.slice(0, racine.length + 1).join("/")}`);
      }
    }
  }
  return out;
}

const args = process.argv.slice(2);
const i = args.indexOf("--base");
// Base : --base ; sur une PR, le point de divergence avec la branche cible ; sur un push, le commit précédent.
function baseParDefaut() {
  const cible = process.env.CI_COMMIT_TARGET_BRANCH;
  if (cible) {
    try {
      return git("merge-base", "HEAD", `origin/${cible}`).trim();
    } catch { /* branche cible absente du clone : on tente la suite */ }
  }
  return process.env.CI_PREV_COMMIT_SHA || "HEAD~1";
}
const demandee = i >= 0 ? args[i + 1] : baseParDefaut();
let briques;
try {
  briques = JSON.parse(readFileSync(".woodpecker/usine/briques.json", "utf8"));
} catch {
  ecrire({ mode: "avertissement", status: "catalogue-indisponible", uncovered: [] });
}
const base = revision(demandee);
const head = revision("HEAD");
if (!base || !head) ecrire({ mode: "avertissement", status: "base-indisponible", base: demandee, uncovered: [] });
const repo = briques.repo;
const avant = cles(base, repo);
const nouvelles = [...cles(head, repo)].filter((k) => !avant.has(k)).sort();
const decidees = new Set(briques.decided || []);
const derogations = [], uncovered = [], decided = [];
for (const k of nouvelles) {
  const ref = (briques.derogations || {})[k];
  if (decidees.has(k)) decided.push(k);
  else if (typeof ref === "string" && REF.test(ref)) derogations.push(k);
  else uncovered.push(k);
}
ecrire({ mode: "avertissement", status: uncovered.length ? "non-couvert" : "ok", repo, base, head, new: nouvelles,
         decided, derogations, uncovered });
