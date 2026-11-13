#!/usr/bin/env node
// Dependency-free repository check. Runs on Node 22.
//
// It mirrors the file checks the Claude plugin directory runs before it lists a
// plugin: manifest and marketplace fields, the README, the licence, the plugin
// folder's files and .gitattributes. It cannot check what the portal checks
// over the network (name availability, publisher identity, the security scan).

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const errors = [];
const skipDirs = new Set([".git", "node_modules", ".nooks"]);

const systemFiles = new Set([".DS_Store", "Thumbs.db", "desktop.ini", "__MACOSX"]);
const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
const imageOrFont = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".woff", ".woff2", ".ttf", ".otf",
]);
const maxFileBytes = 256 * 1024;
const maxFiles = 512;
const minReadmeWords = 40;

function walk(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    if (skipDirs.has(name)) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) found.push(...walk(full));
    else if (stat.isFile()) found.push(full);
  }
  return found;
}

const files = walk(root).sort();
const rel = (file) => relative(root, file).split("\\").join("/");
const check = (condition, message) => {
  if (!condition) errors.push(message);
};

const required = [
  "README.md",
  "LICENSE",
  "SECURITY.md",
  ".gitignore",
  ".mcp.json",
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  "skills/nooks-design/SKILL.md",
  "assets/icon.svg",
  "docs/connector.md",
  "scripts/validate.mjs",
  ".github/workflows/validate.yml",
];

for (const item of required) {
  try {
    statSync(join(root, item));
  } catch {
    errors.push(`${item} is missing`);
  }
}

// Files in the plugin folder: system files, names, sizes and count.
check(files.length <= maxFiles, `the plugin folder has ${files.length} files; the limit is ${maxFiles}`);

const seen = new Map();
for (const file of files) {
  const path = rel(file);
  const name = path.split("/").pop();

  check(!systemFiles.has(name), `${path}: a system file the directory rejects`);
  check(!name.includes(":"), `${path}: a colon is not a valid character in a file name`);
  check(!/[. ]$/.test(name), `${path}: a file name cannot end with a dot or a space`);
  check(!reservedNames.test(name), `${path}: a Windows device name is not a valid file name`);

  const lower = path.toLowerCase();
  if (seen.has(lower)) errors.push(`${path}: differs from ${seen.get(lower)} only by capitalization`);
  else seen.set(lower, path);

  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase() : "";
  if (!imageOrFont.has(ext)) {
    const size = statSync(file).size;
    check(size < maxFileBytes, `${path}: ${size} bytes; a non-image file must stay under ${maxFileBytes}`);
  }
}

// .gitattributes must not rewrite file contents or exclude paths from archives.
for (const file of files.filter((item) => rel(item).split("/").pop() === ".gitattributes")) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const attributes = line.trim().split(/\s+/).slice(1);
    for (const attribute of attributes) {
      if (/^(export-ignore|export-subst|filter)(=|$)/.test(attribute)) {
        errors.push(`${rel(file)}: "${attribute}" is not allowed in .gitattributes`);
      }
    }
  }
}

const json = new Map();
for (const file of files) {
  if (!file.endsWith(".json")) continue;
  try {
    json.set(rel(file), JSON.parse(readFileSync(file, "utf8")));
  } catch {
    errors.push(`${rel(file)}: invalid JSON`);
  }
}

const httpsUrl = (value) => typeof value === "string" && value.startsWith("https://");

const mcp = json.get(".mcp.json");
check(mcp, ".mcp.json is missing or is not valid JSON");
if (mcp) {
  const server = mcp.mcpServers?.nooks;
  check(server?.type === "http", '.mcp.json: mcpServers.nooks.type must be "http"');
  check(httpsUrl(server?.url), ".mcp.json: mcpServers.nooks.url must be an https URL");
  check(!server?.headers || Object.keys(server.headers).length === 0, ".mcp.json: no credential in headers");
}

const plugin = json.get(".claude-plugin/plugin.json");
check(plugin, ".claude-plugin/plugin.json is missing or is not valid JSON");
if (plugin) {
  check(/^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$|^[a-z0-9]$/.test(plugin.name ?? ""), "plugin.json: name must be lowercase letters, digits and hyphens, 1-64 characters, starting and ending with a letter or digit");
  check(!["claude", "anthropic", "official", "plugin", "mcp", "test"].includes(plugin.name), "plugin.json: name is a reserved word");
  check(/^\d+\.\d+\.\d+$/.test(plugin.version ?? ""), "plugin.json: version must be a semantic version");
  check(typeof plugin.description === "string" && plugin.description.length > 0, "plugin.json: description is required");
  check(plugin.author?.name === "Nooks", 'plugin.json: author.name must be "Nooks"');
  check(httpsUrl(plugin.homepage), "plugin.json: homepage must be an https URL");
  check(httpsUrl(plugin.repository), "plugin.json: repository must be an https URL");
  check(plugin.license === "Apache-2.0", 'plugin.json: license must be "Apache-2.0"');
  check(Array.isArray(plugin.keywords) && plugin.keywords.length > 0, "plugin.json: keywords must be a non-empty array");
  check(plugin.displayName === "Nooks", 'plugin.json: displayName must be "Nooks"');

  // The directory reads its listing from these fields, and only from plugin.json.
  for (const field of ["documentationUrl", "supportUrl", "privacyPolicyUrl", "termsOfServiceUrl"]) {
    check(httpsUrl(plugin[field]), `plugin.json: ${field} must be an https URL`);
  }
  const icon = plugin.icon;
  check(typeof icon === "string" && icon.startsWith("./"), 'plugin.json: icon must be a path inside the plugin, starting with ./');
  if (typeof icon === "string" && icon.startsWith("./")) {
    const iconPath = join(root, icon.replace(/^\.\//, ""));
    if (!existsSync(iconPath)) {
      errors.push(`plugin.json: icon points at ${icon}, which does not exist`);
    } else if (!/\.(svg|png|jpe?g|webp|gif)$/i.test(icon)) {
      errors.push("plugin.json: icon must be an SVG, PNG, JPEG, WebP or GIF image");
    } else if (/\.svg$/i.test(icon)) {
      const svg = readFileSync(iconPath, "utf8");
      check(/viewBox="0 0 \d+(?:\.\d+)? \d+(?:\.\d+)?"/.test(svg), "plugin.json: an SVG icon needs a viewBox");
    }
  }
}

const marketplace = json.get(".claude-plugin/marketplace.json");
check(marketplace, ".claude-plugin/marketplace.json is missing or is not valid JSON");
if (marketplace) {
  check(marketplace.name === "nooks", 'marketplace.json: name must be "nooks"');
  check(marketplace.owner?.name === "Nooks", 'marketplace.json: owner.name must be "Nooks"');
  check(Array.isArray(marketplace.plugins) && marketplace.plugins.length === 1, "marketplace.json: exactly one plugin is required");
  check(marketplace.plugins?.[0]?.name === plugin?.name, "marketplace.json: plugin name must match plugin.json");
  check(marketplace.plugins?.[0]?.source === "./", 'marketplace.json: plugin source must be "./"');
}

// The README is the listing description, and the directory requires 40 words.
let readme = "";
try {
  readme = readFileSync(join(root, "README.md"), "utf8");
} catch {
  errors.push("README.md is missing");
}
const readmeWords = readme
  .replace(/```[\s\S]*?```/g, " ")
  .match(/[A-Za-z0-9][A-Za-z0-9'’._-]*/g) ?? [];
check(
  readmeWords.length >= minReadmeWords,
  `README.md: ${readmeWords.length} words outside code blocks; the directory requires at least ${minReadmeWords}`,
);

check(
  json.get(".claude-plugin/plugin.json")?.license || files.some((file) => rel(file) === "LICENSE"),
  "a LICENSE file or a license field in plugin.json is required",
);

let skill = "";
try {
  skill = readFileSync(join(root, "skills", "nooks-design", "SKILL.md"), "utf8").replace(/^\uFEFF/, "");
} catch {
  errors.push("skills/nooks-design/SKILL.md is missing");
}

const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
check(frontmatter, "SKILL.md: missing YAML frontmatter");
if (frontmatter) {
  const meta = {};
  const repeated = new Set();
  for (const line of frontmatter[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const index = line.indexOf(":");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    if (key in meta) repeated.add(key);
    meta[key] = line.slice(index + 1).trim();
  }
  check(repeated.size === 0, `SKILL.md: frontmatter repeats ${[...repeated].join(", ")}; description must be one value`);
  check(meta.name === "nooks-design", 'SKILL.md: frontmatter name must be "nooks-design"');
  check(Boolean(meta.description), "SKILL.md: frontmatter description is required");
  check(!/^[[{|>]/.test(meta.description ?? ""), "SKILL.md: description must be a single text value, not a list or block");
}

const credential = /\bnooks_(?:acc|agt)_[A-Za-z0-9_-]{20,}\b/;
let scanned = 0;
for (const file of files) {
  const text = readFileSync(file, "utf8");
  if (text.includes("\u0000")) continue;
  scanned += 1;
  if (credential.test(text)) {
    errors.push(`${rel(file)}: contains a possible Nooks credential`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`);
  console.error(
    `validate: failed with ${errors.length} problem${errors.length === 1 ? "" : "s"}`,
  );
  process.exit(1);
}

console.log(
  `validate: ok - ${json.size} JSON files, ${scanned} text files, ${readmeWords.length} README words checked`,
);
