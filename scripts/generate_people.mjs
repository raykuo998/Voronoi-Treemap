/**
 * Generate a large, taxonomy-aligned people.json.
 *
 * Usage:
 *   node scripts/generate_people.mjs --count 200 --out people.json --seed 123
 *
 * Notes:
 * - Reads baseTaxonomy from index.html (no extra taxonomy file needed).
 * - Produces sparse per-person skill records (missing skill = usage 0, unlocked 0).
 */
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { count: 200, out: "people.json", seed: 42 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--count") args.count = Number(argv[++i]);
    else if (a === "--out") args.out = String(argv[++i]);
    else if (a === "--seed") args.seed = Number(argv[++i]);
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function xorshift32(seed) {
  let x = (seed | 0) || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    // convert to [0,1)
    return ((x >>> 0) / 4294967296);
  };
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function pickN(rng, arr, n) {
  const a = arr.slice();
  // Fisher-Yates partial shuffle
  for (let i = 0; i < Math.min(n, a.length); i++) {
    const j = i + Math.floor(rng() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function extractBaseTaxonomyFromIndexHtml(indexHtmlText) {
  const marker = "const baseTaxonomy =";
  const idx = indexHtmlText.indexOf(marker);
  if (idx === -1) throw new Error("Could not find baseTaxonomy in index.html");
  const after = indexHtmlText.slice(idx + marker.length);
  const braceStart = after.indexOf("{");
  if (braceStart === -1) throw new Error("Could not find '{' for baseTaxonomy");

  const startPos = idx + marker.length + braceStart;
  let depth = 0;
  let inStr = false;
  let strQuote = "";
  for (let i = startPos; i < indexHtmlText.length; i++) {
    const ch = indexHtmlText[i];
    const prev = indexHtmlText[i - 1];
    if (inStr) {
      if (ch === strQuote && prev !== "\\") {
        inStr = false;
        strQuote = "";
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      inStr = true;
      strQuote = ch;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;
    if (depth === 0) {
      const objText = indexHtmlText.slice(startPos, i + 1);
      // eslint-disable-next-line no-new-func
      return (new Function(`return (${objText});`))();
    }
  }
  throw new Error("Unterminated baseTaxonomy object");
}

function buildCatalog(taxonomy) {
  const domains = Array.isArray(taxonomy?.children) ? taxonomy.children : [];
  const catalog = [];
  for (const domain of domains) {
    const domainName = String(domain?.name || "").trim();
    if (!domainName) continue;
    const skills = Array.isArray(domain?.children) ? domain.children : [];
    for (const skill of skills) {
      const skillName = String(skill?.name || "").trim();
      if (!skillName) continue;
      const subSkills = Array.isArray(skill?.subSkills) ? skill.subSkills : [];
      const subNames = subSkills.map(s => String(s?.name || "").trim()).filter(Boolean);
      catalog.push({ domain: domainName, skill: skillName, subSkillNames: subNames });
    }
  }
  return catalog;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log("node scripts/generate_people.mjs --count 200 --out people.json --seed 42");
    process.exit(0);
  }
  const count = clamp(Number(args.count) || 0, 1, 5000);
  const outPath = String(args.out || "people.json");
  const seed = Number.isFinite(args.seed) ? args.seed : 42;

  const repoRoot = path.resolve(process.cwd());
  const indexPath = path.join(repoRoot, "index.html");
  const indexHtml = fs.readFileSync(indexPath, "utf8");
  const taxonomy = extractBaseTaxonomyFromIndexHtml(indexHtml);
  const catalog = buildCatalog(taxonomy);
  if (catalog.length === 0) throw new Error("Catalog is empty; check taxonomy parsing");

  const rng = xorshift32(seed);
  const people = [];

  for (let i = 0; i < count; i++) {
    const id = `P${String(i + 1).padStart(4, "0")}`;
    const name = `Person ${i + 1}`;

    // Each person has a rich but sparse profile.
    const skillsPerPerson = clamp(Math.round(10 + rng() * 20), 8, 30);
    const picked = pickN(rng, catalog, skillsPerPerson);

    const skills = picked.map(entry => {
      // Usage: skew higher for some people/skills to create contrast
      const base = rng();
      const usage = Math.round(clamp(10 + Math.pow(base, 0.55) * 90, 0, 100));

      // Unlocked sub-skills correlated with usage (richer profiles)
      const subs = entry.subSkillNames;
      const maxUnlock = subs.length;
      const unlockTarget = maxUnlock === 0 ? 0 : clamp(Math.round((usage / 100) * maxUnlock * (0.6 + rng() * 0.6)), 0, maxUnlock);
      const unlockedSubSkills = pickN(rng, subs, unlockTarget);

      return {
        domain: entry.domain,
        skill: entry.skill,
        usage,
        unlockedSubSkills
      };
    });

    people.push({ id, name, skills });
  }

  const out = { people };
  fs.writeFileSync(path.join(repoRoot, outPath), JSON.stringify(out, null, 2), "utf8");
  console.log(`Wrote ${people.length} people to ${outPath}`);
}

main();

