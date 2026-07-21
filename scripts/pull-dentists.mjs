// Bay Area dentist data pull — NPI Registry → Supabase `dentists` table.
// Run:  node scripts/pull-dentists.mjs
// Uses the PUBLIC anon key (safe) + an INSERT policy on the dentists table.
// Dedupe is by NPI (unique column) via ON CONFLICT DO NOTHING.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://sucqnazhditlrrqdbmmq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1Y3FuYXpoZGl0bHJycWRibW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTY1MTUsImV4cCI6MjA5NDY5MjUxNX0.-prAjNEV8kxltF_9i-4JBNcpYe74ez9gyaQzwh8GLhg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Bay Area ZIP prefixes (3-digit) — SF, Peninsula, East Bay, South Bay.
const ZIP_PREFIXES = [
  "940", // Peninsula (Daly City, South SF, San Bruno, Pacifica…)
  "941", // San Francisco
  "943", // Palo Alto / Stanford
  "944", // San Mateo / Redwood City
  "945", // East Bay — Fremont, Hayward, San Leandro, Union City
  "946", // Oakland
  "947", // Berkeley / Richmond
  "950", // Santa Clara / Sunnyvale / Cupertino
  "951", // San Jose
  // Central Valley / San Joaquin Valley
  "952", // Stockton, Lodi, Galt + surrounding (San Joaquin County)
  "953", // Lathrop, Manteca, Tracy, Modesto, Turlock, Ceres, Ripon, Escalon…
];

const NPI_API = "https://npiregistry.cms.hhs.gov/api/";
const PAGE = 200;      // API max per request
const MAX_SKIP = 1000; // API caps skip at 1000 → up to 1200 results per query

// Specialist taxonomies that are NOT priority targets (general practice = priority).
const SPECIALIST = /orthodont|oral.*surg|maxillofacial|endodont|periodont|pediatric|prosthodont|public health/i;
const MEDICAL_HINT = /public health|community/i; // weak hint only; NPI has no real insurance data

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pickLocation(addresses = []) {
  return addresses.find((a) => a.address_purpose === "LOCATION") || addresses[0] || {};
}

function toRow(r) {
  const b = r.basic || {};
  const taxes = r.taxonomies || [];
  const primary = taxes.find((t) => t.primary) || taxes[0] || {};
  const loc = pickLocation(r.addresses);
  const isOrg = r.enumeration_type === "NPI-2";
  const name = isOrg
    ? (b.organization_name || "").trim()
    : [b.first_name, b.last_name].filter(Boolean).join(" ").trim();
  const specialty = (primary.desc || "").trim();
  const priority_target = specialty ? !SPECIALIST.test(specialty) : true;
  const addr = [loc.address_1, loc.address_2].filter(Boolean).join(" ").trim();

  return {
    npi: String(r.number),
    name: name || null,
    practice_name: isOrg ? (b.organization_name || null) : (b.organization_name || null),
    specialty: specialty || null,
    address: addr || null,
    city: loc.city || null,
    state: loc.state || null,
    zip: loc.postal_code ? String(loc.postal_code).slice(0, 5) : null,
    phone: loc.telephone_number || null,
    website: null,
    accepts_medical: MEDICAL_HINT.test(specialty), // placeholder; enrich later
    priority_target,
    status: "not_contacted",
  };
}

async function fetchPage(prefix, skip) {
  const url = `${NPI_API}?version=2.1&country_code=US&state=CA&taxonomy_description=Dentist&postal_code=${prefix}*&limit=${PAGE}&skip=${skip}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NPI API ${res.status} for ${prefix} skip=${skip}`);
  const json = await res.json();
  return json.results || [];
}

async function main() {
  const byNpi = new Map();

  // Optional: run only a subset of prefixes, e.g. ONLY_PREFIXES=952,953
  const PREFIXES = process.env.ONLY_PREFIXES
    ? process.env.ONLY_PREFIXES.split(",").map((s) => s.trim())
    : ZIP_PREFIXES;

  for (const prefix of PREFIXES) {
    let skip = 0;
    let prefixCount = 0;
    while (skip <= MAX_SKIP) {
      let results;
      try {
        results = await fetchPage(prefix, skip);
      } catch (e) {
        console.warn(`  ! ${e.message} — skipping rest of ${prefix}`);
        break;
      }
      if (!results.length) break;
      for (const r of results) {
        if (!byNpi.has(String(r.number))) byNpi.set(String(r.number), toRow(r));
      }
      prefixCount += results.length;
      if (results.length < PAGE) break; // last page
      skip += PAGE;
      await sleep(250); // be polite to the API
    }
    console.log(`ZIP ${prefix}* → ${prefixCount} results (running unique: ${byNpi.size})`);
  }

  // The NPI search matches ANY of a provider's addresses, but we store their
  // primary LOCATION — which can be out of state/region. Keep only rows whose
  // stored location is in CA and within one of the target ZIP prefixes.
  const inRegion = (r) => r.state === "CA" && r.zip && PREFIXES.some((p) => r.zip.startsWith(p));
  const allRows = [...byNpi.values()];
  const rows = allRows.filter(inRegion);
  const droppedGeo = allRows.length - rows.length;
  console.log(`\nFetched ${allRows.length} unique; dropped ${droppedGeo} out-of-region, kept ${rows.length}. Inserting…`);

  // Insert in batches (plain insert works with the anon INSERT policy).
  // If a batch hits a duplicate NPI (23505), fall back to row-by-row, skipping dupes.
  let inserted = 0;
  let skipped = 0;
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("dentists").insert(batch);
    if (!error) {
      inserted += batch.length;
    } else if (error.code === "23505") {
      for (const r of batch) {
        const { error: e2 } = await supabase.from("dentists").insert([r]);
        if (!e2) inserted++;
        else if (e2.code === "23505") skipped++;
        else { console.error("Row insert error:", e2.code, e2.message); process.exit(1); }
      }
    } else {
      console.error(`Insert error on batch ${i / BATCH}:`, error.code, error.message);
      process.exit(1);
    }
    console.log(`  progress: inserted ${inserted}, skipped(dupe) ${skipped}`);
  }

  const priority = rows.filter((r) => r.priority_target).length;
  console.log(`\n==== SUMMARY ====`);
  console.log(`Unique dentists pulled from NPI: ${rows.length}`);
  console.log(`Newly inserted: ${inserted}   Skipped as duplicates: ${skipped}`);
  console.log(`Priority targets (general/family): ${priority}`);
  console.log(`Non-priority (specialists):        ${rows.length - priority}`);

  console.log(`\n==== SAMPLE (first 10) ====`);
  console.log(JSON.stringify(rows.slice(0, 10), null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
