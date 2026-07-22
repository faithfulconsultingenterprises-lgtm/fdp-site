import React, { useState, useRef } from "react";
import { Sparkles, ArrowRight, Check, Phone, Shield, RotateCcw, ChevronRight, ChevronDown, HeartHandshake, ExternalLink } from "lucide-react";
import { supabase } from "./supabaseClient.js";

/* ============================================================
   FIND DENTAL PROVIDERS — Plan Finder (Ship 2)
   Asks questions → matches to the right carrier → sends to the
   REAL paid enroll link (person sees their own price/coverage there).
   Only routes to "Call 877-DDS-DOCS" when they ask for help
   or can't be matched — capturing their answers first.

   TODO for Claude Code: save the collected `lead` object to Supabase
   (and forward to the CRM) at the point marked ⬇ SAVE LEAD.
   ============================================================ */

const C = {
  brand: "#1657B0", brand2: "#2A6FCE", brandDeep: "#0C2E5A", sky: "#E7F0FB",
  gold: "#F4B43C", goldDeep: "#DB9B23", goldSoft: "#FBEEC9", ink: "#17233A",
  muted: "#5A6B85", bg: "#F6F8FB", surface: "#FFFFFF", line: "#DCE5F0",
};
const FONT = "'Hanken Grotesk',system-ui,sans-serif";
const DISPLAY = "'Bricolage Grotesque',Georgia,serif";

/* YOUR REAL PAID LINKS */
const CARRIERS = {
  dfe: {
    name: "Dental for Everyone",
    brand: "Delta network",
    link: "https://brokers.dentalforeveryone.com/?Portal=14956642",
    wins: [
      "One of the largest dentist networks in the country",
      "Covers major services — implants, dentures, partials, and bridges",
      "Plans available with no waiting period",
    ],
  },
  humana: {
    name: "Humana",
    link: "https://www.humana.com/aoadv/1971186",
    note: "Lower cost, but limited major-service coverage and a smaller network.",
  },
  ameritas: {
    name: "Ameritas",
    link: "https://myplan.ameritas.com/id/010Z6208",
    note: "Fine for routine cleanings, but a smaller network and weaker on major work.",
  },
};

const PHONE = "877-337-3627"; // 877-DDS-DOCS

/* Life-insurance upsell — the EXACT wording the person agrees to when they tick
   the (unchecked-by-default) box. Stored in insurance_leads.life_consent_version
   so consent is auditable per product. Bump the version prefix if the text changes.
   NOTE: this is CALL/contact consent for a DIFFERENT product than dental — it does
   NOT authorize an automated life-insurance SMS cadence. Treat life_interest as a
   "call/prioritize" flag in the CRM. */
const LIFE_CONSENT_VERSION = "life-v1 (2026-07-21): Yes, a licensed agent may contact me about life insurance.";

/* the questions */
const Q = [
  { id: "need", label: "What do you need dental coverage for?", opts: [
    ["major", "Major work (crown, implant, root canal, dentures)"],
    ["routine", "Routine care (cleanings, checkups, fillings)"],
    ["family", "Coverage for my family / kids"],
    ["senior", "I'm 65+ / on Medicare"],
    ["unsure", "I'm not sure — I need help"],
  ]},
  { id: "coverage", label: "Do you have any dental coverage right now?", opts: [
    ["none", "No coverage"],
    ["medical", "Medi-Cal / Medicaid"],
    ["lost", "Just lost my coverage"],
    ["some", "I have some but need better"],
  ]},
  { id: "urgency", label: "How soon do you need it?", opts: [
    ["now", "As soon as possible"],
    ["soon", "Within a month"],
    ["planning", "Just planning ahead"],
  ]},
];

/* Optional post-submit life-insurance qualifier — 3 quick tappable questions,
   easiest first. Values are stored as codes; the CRM maps them to labels. */
const LIFE_Q = [
  { key: "age",     param: "p_age",      q: "What's your age range?",
    opts: [["18-29", "18–29"], ["30-44", "30–44"], ["45-59", "45–59"], ["60+", "60+"]] },
  { key: "hasLife", param: "p_has_life", q: "Do you have life insurance now?",
    opts: [["yes", "Yes"], ["no", "No"], ["unsure", "Not sure"]] },
  { key: "timing",  param: "p_timing",   q: "When would you want coverage in place?",
    opts: [["now", "Right away"], ["months", "Next few months"], ["exploring", "Just exploring"]] },
];

function matchCarrier(a) {
  // Dental for Everyone (Delta) is the PRIMARY recommendation at every age and every need path —
  // largest network, real major-service coverage, no-waiting-period plans. The results screen
  // shows Humana + Ameritas below it as an honest comparison. "I need help" → a live agent.
  if (a.need === "unsure") return { help: true, reason: "You told us you'd like help choosing — a licensed agent is the best next step." };
  let reason;
  if (a.need === "major")
    reason = "Since you need major work, Dental for Everyone (Delta) is the clear best fit — it covers implants, dentures, partials, and bridges, with plans that can start you with no waiting period.";
  else if (a.need === "senior")
    reason = "At 65 and up you want real coverage for the big stuff — Dental for Everyone (Delta) covers implants, dentures, partials, and bridges on one of the largest networks, with no-waiting-period plans available.";
  else if (a.need === "family")
    reason = "For your family, Dental for Everyone (Delta) gives you the largest network plus real coverage if anyone ever needs major work — including no-waiting-period options.";
  else if (a.need === "routine")
    reason = "Even for routine care, Dental for Everyone (Delta) is the best value — the largest network today, and you're already covered for major work later, with no-waiting-period plans available.";
  else
    reason = "Dental for Everyone (Delta) is your best fit — one of the largest networks, real coverage for major services, and plans available with no waiting period.";
  return { carrier: CARRIERS.dfe, reason };
}

export default function PlanFinder() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null); // {carrier, reason} | {help}
  const [showCompare, setShowCompare] = useState(false); // "Compare other options" expander on the results screen
  const [askHuman, setAskHuman] = useState(false);
  const [lead, setLead] = useState({ name: "", phone: "", zip: "" });
  const [lifeInterest, setLifeInterest] = useState(false); // life-insurance upsell — explicit opt-in, UNCHECKED by default
  const [qualToken, setQualToken] = useState(null);        // unguessable handle for the post-submit life qualifier RPC
  const [lifeStep, setLifeStep] = useState(0);             // qualifier: 0..LIFE_Q.length-1 = a question, length = complete
  const [qualSkipped, setQualSkipped] = useState(false);   // they tapped "Skip for now"
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function choose(qid, val) {
    const next = { ...answers, [qid]: val };
    setAnswers(next);
    if (step < Q.length - 1) { setStep(step + 1); }
    else { setResult(matchCarrier(next)); }
  }
  function reset() { setStep(0); setAnswers({}); setResult(null); setShowCompare(false); setAskHuman(false); setLead({ name: "", phone: "", zip: "" }); setLifeInterest(false); setQualToken(null); setLifeStep(0); setQualSkipped(false); setSaved(false); setSaving(false); setSaveError(""); }

  async function submitCallback() {
    // ⬇ SAVE LEAD — write the collected lead to Supabase (insurance_leads table)
    const now = new Date().toISOString();
    const token = crypto.randomUUID();                      // unguessable handle so we can safely update THIS row later
    const payload = {
      ...answers, ...lead,
      status: result?.help ? "needs-help" : "self-serve-wanted-call",
      life_interest: lifeInterest,                          // explicit opt-in; false unless they ticked the box
      life_consent_at: lifeInterest ? now : null,           // proof of WHEN they consented
      life_consent_version: lifeInterest ? LIFE_CONSENT_VERSION : null, // proof of WHAT wording
      qualifier_token: token,                               // used ONLY by the scoped qualify_life_lead RPC
      created_at: now,
    };
    setSaving(true);
    setSaveError("");
    try {
      const { error } = await supabase.from("insurance_leads").insert([payload]);
      if (error) throw error;
      setQualToken(token);
      setSaved(true);
    } catch (e) {
      console.error("Failed to save lead:", e);
      setSaveError("We couldn't save that just now — please call 877-DDS-DOCS and we'll help you right away.");
    } finally {
      setSaving(false);
    }
  }

  // Optional life qualifier — tap answers, auto-advance, save each answer as we go.
  // Optimistic advance keeps it snappy; a failed save is silent because the lead
  // (and consent) are ALREADY saved — the qualifier is a bonus, never a blocker.
  async function answerLife(idx, val) {
    const q = LIFE_Q[idx];
    setLifeStep(idx + 1);
    try {
      await supabase.rpc("qualify_life_lead", { p_token: qualToken, [q.param]: val });
    } catch (e) {
      console.error("qualifier save failed:", e);
    }
  }
  function skipLife() { setQualSkipped(true); }

  const box = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 22, padding: "clamp(18px,3vw,30px)", boxShadow: "0 40px 80px -50px rgba(12,46,90,.5)", maxWidth: 640, margin: "0 auto" };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: FONT, color: C.ink, padding: "34px 18px 60px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
        .b:focus-visible,.in:focus-visible{outline:3px solid ${C.gold};outline-offset:2px}
        .in::placeholder{color:#9BAAC4}
        @keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fade{animation:fade .35s ease both}
        @media(prefers-reduced-motion:reduce){.fade{animation:none!important}}
        .cta{transition:transform .15s,filter .15s}.cta:hover{transform:translateY(-1px);filter:brightness(1.05)}
        .opt{transition:background .15s,border-color .15s,transform .1s}
        .opt:hover{background:${C.sky};border-color:${C.brand};transform:translateY(-1px)}
      `}</style>

      <div style={{ maxWidth: 640, margin: "0 auto 22px", display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: C.brand, display: "grid", placeItems: "center" }}><Sparkles size={18} color={C.gold} /></div>
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, letterSpacing: "-.02em" }}>Find Dental Providers</span>
      </div>

      {/* QUESTIONS */}
      {!result && (
        <div className="fade" style={box}>
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {Q.map((_, i) => <div key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i <= step ? C.brand : C.line }} />)}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: C.brand }}>Question {step + 1} of {Q.length}</div>
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: "clamp(22px,3.4vw,28px)", letterSpacing: "-.02em", margin: "8px 0 18px", lineHeight: 1.15 }}>{Q[step].label}</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {Q[step].opts.map(([val, txt]) => (
              <button key={val} className="b opt" onClick={() => choose(Q[step].id, val)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textAlign: "left", background: "#fff", border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "15px 18px", cursor: "pointer", fontFamily: FONT, fontSize: 16, fontWeight: 500, color: C.ink }}>
                {txt} <ChevronRight size={18} color={C.brand} style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
          {step > 0 && <button className="b" onClick={() => setStep(step - 1)} style={{ marginTop: 16, background: "none", border: "none", color: C.muted, fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>← Back</button>}
        </div>
      )}

      {/* RESULT — primary recommendation (Dental for Everyone / Delta) + honest comparison */}
      {result && result.carrier && !askHuman && !saved && (
        <div className="fade" style={box}>
          <button className="b" onClick={reset} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: C.muted, background: "none", border: "none", cursor: "pointer", marginBottom: 14 }}><RotateCcw size={14} /> Start over</button>

          {/* AI reasoning */}
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", background: C.brandDeep, color: "#DEE9F7", borderRadius: 14, padding: "16px 18px", marginBottom: 18 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(244,180,60,.2)", display: "grid", placeItems: "center", flexShrink: 0 }}><Sparkles size={16} color={C.gold} /></div>
            <div style={{ fontSize: 15.5, lineHeight: 1.45 }}>{result.reason}</div>
          </div>

          {/* PRIMARY — full prominent card */}
          <span style={{ display: "inline-block", fontSize: 11.5, fontWeight: 700, color: C.goldDeep, background: C.goldSoft, padding: "3px 10px", borderRadius: 999 }}>YOUR BEST FIT</span>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 25, letterSpacing: "-.02em", margin: "10px 0 0", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {result.carrier.name}
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12.5, color: C.brand, background: C.sky, borderRadius: 999, padding: "3px 11px" }}>{result.carrier.brand}</span>
          </div>
          <div style={{ display: "grid", gap: 9, margin: "14px 0 16px" }}>
            {result.carrier.wins.map((w, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14.5, color: C.ink, lineHeight: 1.4 }}>
                <span style={{ width: 21, height: 21, borderRadius: 999, background: "#E1F0E6", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}><Check size={13} color="#1E7A46" /></span>
                {w}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 14, color: C.ink, background: C.sky, borderRadius: 10, padding: "12px 14px", margin: "0 0 16px", lineHeight: 1.5 }}>
            👉 Click below to see <b>your exact price and coverage</b> for your zip code and age, then enroll right there. Coverage amounts vary by plan and area.
          </p>
          <a href={result.carrier.link} target="_blank" rel="noreferrer" className="b cta"
            style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, textDecoration: "none", background: C.gold, color: C.brandDeep, fontFamily: FONT, fontWeight: 700, fontSize: 16.5, padding: "15px", borderRadius: 13 }}>
            See my price &amp; enroll <ExternalLink size={18} />
          </a>
          <button className="b" onClick={() => setAskHuman(true)} style={{ width: "100%", marginTop: 12, background: "#fff", color: C.brand, border: `1.5px solid ${C.line}`, fontFamily: FONT, fontWeight: 700, fontSize: 15, padding: "13px", borderRadius: 12, cursor: "pointer", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
            <Phone size={16} /> I'd rather talk to someone
          </button>

          {/* Compare other options — collapsed by default; honest one-line notes, working links */}
          <button className="b" onClick={() => setShowCompare(v => !v)} style={{ width: "100%", marginTop: 18, background: "none", border: "none", color: C.muted, fontFamily: FONT, fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
            Compare other options <ChevronDown size={15} style={{ transform: showCompare ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {showCompare && (
            <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
              {[CARRIERS.humana, CARRIERS.ameritas].map((c) => (
                <div key={c.name} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "13px 15px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 200px" }}>
                    <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, color: C.ink }}>{c.name}</div>
                    <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{c.note}</div>
                  </div>
                  <a href={c.link} target="_blank" rel="noreferrer" className="b cta" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: "#fff", color: C.brand, border: `1.5px solid ${C.line}`, fontFamily: FONT, fontWeight: 700, fontSize: 13.5, padding: "9px 14px", borderRadius: 10, whiteSpace: "nowrap" }}>See price <ExternalLink size={14} /></a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* NEEDS HELP (unsure) OR asked for a human → capture qualified lead */}
      {result && (result.help || askHuman) && !saved && (
        <div className="fade" style={box}>
          <div style={{ textAlign: "center", marginBottom: 6 }}>
            <div style={{ width: 52, height: 52, borderRadius: 999, background: C.sky, display: "grid", placeItems: "center", margin: "0 auto 12px" }}><HeartHandshake size={26} color={C.brand} /></div>
            <h2 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 24, letterSpacing: "-.02em", margin: 0 }}>Let&rsquo;s get you real help.</h2>
            <p style={{ fontSize: 15.5, color: C.muted, margin: "8px 0 0", lineHeight: 1.5 }}>Leave your info and a licensed agent will call you back — or call us now.</p>
          </div>

          <a href={`tel:${PHONE}`} className="b cta" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, textDecoration: "none", background: C.brand, color: "#fff", fontFamily: FONT, fontWeight: 700, fontSize: 17, padding: "15px", borderRadius: 13, margin: "18px 0" }}>
            <Phone size={18} /> Call now: 877-DDS-DOCS
          </a>

          <div style={{ textAlign: "center", fontSize: 13, color: C.muted, margin: "0 0 14px" }}>— or have us call you —</div>

          <div style={{ display: "grid", gap: 10 }}>
            <input className="in b" value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} placeholder="Your name" style={{ fontFamily: FONT, fontSize: 15, padding: "12px 14px", borderRadius: 11, border: `1.5px solid ${C.line}`, background: "#fff", color: C.ink }} />
            <input className="in b" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} placeholder="Phone number" inputMode="tel" style={{ fontFamily: FONT, fontSize: 15, padding: "12px 14px", borderRadius: 11, border: `1.5px solid ${C.line}`, background: "#fff", color: C.ink }} />
            <input className="in b" value={lead.zip} onChange={(e) => setLead({ ...lead, zip: e.target.value })} placeholder="ZIP code" inputMode="numeric" style={{ fontFamily: FONT, fontSize: 15, padding: "12px 14px", borderRadius: 11, border: `1.5px solid ${C.line}`, background: "#fff", color: C.ink }} />

            {/* Life-insurance upsell — ONE extra opt-in. UNCHECKED by default; never gates the dental callback. */}
            <label style={{ display: "flex", gap: 11, alignItems: "flex-start", cursor: "pointer", fontSize: 14, color: C.ink, lineHeight: 1.5, background: C.goldSoft, border: `1px solid ${C.goldDeep}33`, borderRadius: 12, padding: "12px 14px" }}>
              <input type="checkbox" className="b" checked={lifeInterest} onChange={(e) => setLifeInterest(e.target.checked)}
                style={{ width: 19, height: 19, marginTop: 1, flexShrink: 0, accentColor: C.brand, cursor: "pointer" }} />
              <span><b>Want a free life insurance quote too?</b><br />Yes, a licensed agent may contact me about life insurance.</span>
            </label>

            <button className="b cta" onClick={submitCallback} disabled={!lead.name || !lead.phone || saving}
              style={{ background: (lead.name && lead.phone && !saving) ? C.gold : "#E7EBF2", color: (lead.name && lead.phone && !saving) ? C.brandDeep : "#9BAAC4", border: "none", fontFamily: FONT, fontWeight: 700, fontSize: 16, padding: "14px", borderRadius: 12, cursor: (lead.name && lead.phone && !saving) ? "pointer" : "not-allowed" }}>
              {saving ? "Saving…" : "Request my call back"}
            </button>
            <p style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, margin: 0, textAlign: "center" }}>
              By requesting a call, you agree a licensed agent may call or text you about dental coverage at the number provided. Msg &amp; data rates may apply. Consent isn&rsquo;t a condition of purchase.
            </p>
            {saveError && <p style={{ color: "#B42318", background: "#FEF3F2", border: "1px solid #FECDCA", borderRadius: 10, padding: "10px 12px", fontSize: 13.5, lineHeight: 1.45, margin: 0 }}>{saveError}</p>}
          </div>
          <button className="b" onClick={reset} style={{ display: "block", margin: "14px auto 0", background: "none", border: "none", color: C.muted, fontFamily: FONT, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>← Start over</button>
        </div>
      )}

      {/* SAVED confirmation — customer-facing only (no internal CRM/lead details) */}
      {saved && (
        <div className="fade" style={box}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: C.brand, display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Check size={28} color="#fff" /></div>
            <h2 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 25, letterSpacing: "-.02em", margin: 0 }}>Got it{lead.name ? `, ${lead.name.split(" ")[0]}` : ""}!</h2>
            <p style={{ fontSize: 15.5, color: C.muted, margin: "8px auto 0", maxWidth: "42ch" }}>Your dental callback is confirmed — an agent will call you shortly. Or call <b style={{ color: C.brand }}>877-DDS-DOCS</b>.</p>
          </div>
          {/* Optional LIFE INSURANCE qualifier — ONLY if they opted in. Given its OWN identity and a
              clear break from the dental confirmation above so the two don't blend. An OFFER, not a request. */}
          {lifeInterest && !qualSkipped && lifeStep < LIFE_Q.length && (
            <div style={{ marginTop: 22, borderTop: `1px solid ${C.line}`, paddingTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: C.goldDeep, marginBottom: 8, display: "flex", alignItems: "center", gap: 7 }}>
                <Shield size={14} color={C.goldDeep} /> Life insurance quote
              </div>
              <div style={{ background: C.goldSoft, border: `1px solid ${C.goldDeep}44`, borderRadius: 16, padding: "18px 18px 14px" }}>
                <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                  {LIFE_Q.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= lifeStep ? C.goldDeep : "#EAD9AC" }} />)}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: C.goldDeep }}>Life insurance quote · {lifeStep + 1} of {LIFE_Q.length}</div>
                <h3 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 20, letterSpacing: "-.01em", margin: "6px 0 3px", color: C.brandDeep }}>Want us to prep your life insurance quote before we call?</h3>
                <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 10px" }}>3 quick taps — one call, both covered.</p>
                <p style={{ fontSize: 12.5, color: C.brandDeep, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 11px", margin: "0 0 16px", lineHeight: 1.45 }}>
                  <Check size={13} color={C.brand} style={{ verticalAlign: "-2px", marginRight: 5 }} />
                  Your dental callback is already confirmed. This is just for the life insurance quote you asked about.
                </p>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: C.ink, marginBottom: 10 }}>{LIFE_Q[lifeStep].q}</div>
                <div style={{ display: "grid", gap: 9 }}>
                  {LIFE_Q[lifeStep].opts.map(([val, txt]) => (
                    <button key={val} className="b opt" onClick={() => answerLife(lifeStep, val)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, textAlign: "left", background: "#fff", border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "13px 16px", cursor: "pointer", fontFamily: FONT, fontSize: 15.5, fontWeight: 600, color: C.ink }}>
                      {txt} <ChevronRight size={17} color={C.brand} style={{ flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
                <button className="b" onClick={skipLife} style={{ display: "block", margin: "14px auto 2px", background: "none", border: "none", color: C.muted, fontFamily: FONT, fontSize: 13, fontWeight: 600, textDecoration: "underline", cursor: "pointer" }}>Skip for now</button>
              </div>
            </div>
          )}

          {/* Qualifier complete — warm close */}
          {lifeInterest && !qualSkipped && lifeStep >= LIFE_Q.length && (
            <div style={{ marginTop: 18, background: C.sky, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: C.brandDeep, margin: 0, lineHeight: 1.45 }}>Perfect — your agent will have options ready when they call.</p>
            </div>
          )}

          <button className="b" onClick={reset} style={{ display: "block", margin: "20px auto 0", background: "none", border: "none", color: C.muted, fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: "pointer" }}><RotateCcw size={14} style={{ verticalAlign: "-2px" }} /> Run it again</button>
        </div>
      )}

      <p style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 22 }}>Prices &amp; coverage shown on carrier site · varies by zip &amp; age · Call 877-DDS-DOCS</p>
    </div>
  );
}
