import React, { useState, useRef, useEffect } from "react";
import {
  MapPin, Star, Clock, Check, ArrowRight, Shield, Sparkles, CalendarCheck,
  RotateCcw, Phone, Stethoscope, HeartHandshake, CreditCard, Users, Search,
  Baby, Smile, Scissors, Activity, Calculator, BadgeCheck, Mail, PhoneCall,
  Building2, GraduationCap, Truck, LayoutDashboard, Menu, X, Quote
} from "lucide-react";

/* ================= FIND DENTAL PROVIDERS — full site v2 (imagery + brand blue) ================= */
const C = {
  brand: "#1657B0", brand2: "#2A6FCE", brandDeep: "#0C2E5A", sky: "#E7F0FB", skyLine: "#CFE0F5",
  gold: "#F4B43C", goldDeep: "#DB9B23", goldSoft: "#FBEEC9", ink: "#17233A", muted: "#5A6B85",
  bg: "#F6F8FB", surface: "#FFFFFF", line: "#DCE5F0",
};
const FONT = "'Hanken Grotesk',system-ui,sans-serif";
const DISPLAY = "'Bricolage Grotesque',Georgia,serif";

/* Free, license-safe Unsplash stock (swap for your own community photos later).
   Every <Photo> has a brand-gradient fallback so nothing ever looks broken. */
const IMG = {
  hero: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=1400&q=80&auto=format&fit=crop",
  family: "https://images.unsplash.com/photo-1543342384-1f1350e27861?w=1200&q=80&auto=format&fit=crop",
  momChild: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=1000&q=80&auto=format&fit=crop&crop=faces",
  dentist: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&q=80&auto=format&fit=crop",
  smile: "https://images.unsplash.com/photo-1595003500447-88a1e6c6a1b1?w=1000&q=80&auto=format&fit=crop&crop=faces",
  community: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1200&q=80&auto=format&fit=crop&crop=faces",
  child: "https://images.unsplash.com/photo-1519337265831-281ec6cc8514?w=1000&q=80&auto=format&fit=crop&crop=faces",
};
const GRAD = [
  `linear-gradient(135deg,${C.brand2},${C.brandDeep})`,
  `linear-gradient(135deg,${C.gold},${C.goldDeep})`,
  `linear-gradient(135deg,${C.brand},${C.brand2})`,
  `linear-gradient(160deg,#2A6FCE,#12457F)`,
];
function Photo({ src, alt, radius = 18, ratio, fallback = 0, overlay, style }) {
  const [ok, setOk] = useState(true);
  return (
    <div style={{ position: "relative", borderRadius: radius, overflow: "hidden", background: GRAD[fallback], ...(ratio ? { aspectRatio: ratio } : {}), ...style }}>
      {ok && <img src={src} alt={alt} onError={() => setOk(false)} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      {!ok && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: .5 }}><Sparkles size={40} color="#fff" /></div>}
      {overlay && <div style={{ position: "absolute", inset: 0, background: overlay }} />}
    </div>
  );
}

/* ---------- booking engine ---------- */
const PROVIDERS = [
  { id: 1, name: "Bright Smile Family Dental", specialty: "General & Family", city: "Oakland, CA", rating: 4.8, reviews: 612, tags: { medical: 1, kids: 1, spanish: 1, anxious: 1, cleaning: 1 }, blurb: "Whole-family practice, patient with first-timers." },
  { id: 2, name: "Gentle Care Dentistry", specialty: "General Dentistry", city: "San Jose, CA", rating: 4.9, reviews: 848, tags: { anxious: 1, ppo: 1, cleaning: 1, cosmetic: 1, rootcanal: 1 }, blurb: "Sedation options and a calm, no-judgment approach." },
  { id: 3, name: "Bay Area Pediatric Dental", specialty: "Pediatric", city: "Fremont, CA", rating: 4.7, reviews: 391, tags: { kids: 1, medical: 1, cleaning: 1 }, blurb: "Kid-first offices with movies over every chair." },
  { id: 4, name: "Lathrop Dental Group", specialty: "General & Cosmetic", city: "Lathrop, CA", rating: 4.6, reviews: 274, tags: { ppo: 1, cosmetic: 1, implant: 1, cleaning: 1 }, blurb: "Cosmetic and implant work with in-house financing." },
  { id: 5, name: "Community Dental Access", specialty: "General Dentistry", city: "Stockton, CA", rating: 4.5, reviews: 503, tags: { medical: 1, uninsured: 1, spanish: 1, cleaning: 1, urgent: 1 }, blurb: "Sliding-scale pricing and walk-in emergency slots." },
];
const RL = { medical: "Accepts Medi-Cal", uninsured: "Sliding-scale / cash-friendly", ppo: "In-network PPO", anxious: "Gentle with anxious patients", kids: "Great with kids", urgent: "Can see you fast", cleaning: "Same-week cleanings", cosmetic: "Cosmetic specialist", implant: "Implants & restorations", rootcanal: "Root canal care", spanish: "Se habla español" };
const EX = ["I have a toothache and I'm on Medi-Cal", "I'm scared of the dentist and need a cleaning", "My daughter needs her first checkup", "No insurance, need a tooth pulled soon"];
function detect(t) { const q = t.toLowerCase(), s = {};
  if (/medicaid|medi-?cal|medi cal/.test(q)) s.medical = 1;
  if (/no insurance|uninsured|without insurance|can'?t afford|cash|out of pocket/.test(q)) s.uninsured = 1;
  if (/ppo|delta|blue cross|cigna|aetna|metlife|guardian|in-?network/.test(q)) s.ppo = 1;
  if (/scare|afraid|anxious|nervous|fear|phobi|dread/.test(q)) s.anxious = 1;
  if (/kid|child|children|son|daughter|toddler|baby|pediatric|first checkup/.test(q)) s.kids = 1;
  if (/pain|hurt|ache|toothache|emergency|broke|broken|swollen|bleed|abscess|chipped|pull|extract|urgent|asap|today|soon/.test(q)) s.urgent = 1;
  if (/clean|checkup|check-up|hygiene|exam|routine/.test(q)) s.cleaning = 1;
  if (/whiten|cosmetic|veneer|smile makeover/.test(q)) s.cosmetic = 1;
  if (/implant|missing tooth|denture/.test(q)) s.implant = 1;
  if (/root canal|nerve/.test(q)) s.rootcanal = 1;
  if (/spanish|español|espanol|habla/.test(q)) s.spanish = 1;
  return s; }
function match(sig) { const keys = Object.keys(sig);
  const scored = PROVIDERS.map((p) => { let sc = 0; const r = [];
    keys.forEach((k) => { if (p.tags[k]) { sc += (k === "urgent" || k === "medical" || k === "uninsured") ? 3 : 2; if (RL[k]) r.push(RL[k]); } });
    sc += (p.rating - 4.5) * 2; return { ...p, sc, reasons: [...new Set(r)].slice(0, 4) }; });
  const m = scored.filter((p) => p.sc > 0).sort((a, b) => b.sc - a.sc);
  return (m.length ? m : scored.sort((a, b) => b.rating - a.rating)).slice(0, 3).map((p) => { if (!p.reasons.length) p.reasons = ["Highly rated near you", "Accepting new patients"]; return p; }); }
function concierge(sig) { const b = [];
  if (sig.urgent) b.push("you need to be seen soon"); if (sig.medical) b.push("you're on Medi-Cal");
  if (sig.uninsured) b.push("you're paying out of pocket"); if (sig.anxious) b.push("the dentist makes you nervous");
  if (sig.kids) b.push("it's for your child"); if (sig.ppo) b.push("you have PPO coverage");
  if (!b.length) return "Here are the best-fit offices near you accepting new patients right now.";
  const j = b.length === 1 ? b[0] : b.slice(0, -1).join(", ") + " and " + b[b.length - 1];
  return `Because ${j}, I put these offices first — they fit and they have real openings.`; }
function slots(u, seed) { const d = ["Today", "Tomorrow", "Wed", "Thu", "Fri", "Mon"], t = ["8:20 AM", "9:40 AM", "11:00 AM", "1:15 PM", "2:45 PM", "4:30 PM"], o = [], st = u ? 0 : 1;
  for (let i = 0; i < 3; i++) o.push(`${d[(st + i + seed) % d.length]} · ${t[(i * 2 + seed) % t.length]}`); return o; }

function BookingDemo() {
  const [stage, setStage] = useState("input"), [q, setQ] = useState(""), [sig, setSig] = useState({}), [ms, setMs] = useState([]), [step, setStep] = useState(0), [booked, setBooked] = useState(null);
  const ref = useRef(null);
  const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STEPS = ["Reading what you told us…", "Checking which offices take your coverage…", "Finding real openings near you…", "Matching you to the right fit…"];
  function run(text) { const t = (text ?? q).trim(); if (!t) { ref.current && ref.current.focus(); return; } const g = detect(t); setQ(t); setSig(g); setMs(match(g)); setStage("matching"); setStep(0); }
  useEffect(() => { if (stage !== "matching") return; const per = reduce ? 110 : 600;
    if (step < STEPS.length) { const id = setTimeout(() => setStep((s) => s + 1), per); return () => clearTimeout(id); }
    const id = setTimeout(() => setStage("results"), reduce ? 60 : 300); return () => clearTimeout(id); }, [stage, step, reduce]);
  function reset() { setStage("input"); setQ(""); setSig({}); setMs([]); setStep(0); setBooked(null); }
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 22, padding: "clamp(16px,3vw,26px)", boxShadow: "0 40px 80px -50px rgba(12,46,90,.5)" }}>
      {stage === "input" && (<div className="fade">
        <div style={{ maxWidth: 720, margin: "0 auto", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 16, padding: 8 }}>
          <textarea ref={ref} className="fdp-in" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }}
            placeholder="e.g. I chipped a tooth, I have Medi-Cal, and I'm nervous about dentists…" rows={3}
            style={{ width: "100%", border: "none", resize: "none", outline: "none", fontFamily: FONT, fontSize: 17, lineHeight: 1.5, color: C.ink, background: "transparent", padding: "12px 12px 4px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 6px", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 12.5, color: C.muted }}>Private &amp; free</span>
            <button className="fdp-btn fdp-cta" onClick={() => run()} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.gold, color: C.brandDeep, border: "none", fontFamily: FONT, fontWeight: 700, fontSize: 16, padding: "12px 22px", borderRadius: 12, cursor: "pointer" }}>Find my dentist <ArrowRight size={18} /></button>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center", marginTop: 16 }}>
          {EX.map((e) => <button key={e} className="fdp-btn fdp-chip" onClick={() => run(e)} style={{ fontFamily: FONT, fontSize: 13.5, color: C.brand, background: C.surface, border: `1px solid ${C.line}`, padding: "8px 14px", borderRadius: 999, cursor: "pointer" }}>{e}</button>)}
        </div>
      </div>)}
      {stage === "matching" && (<div className="fade" style={{ maxWidth: 520, margin: "0 auto", padding: "10px 4px" }}>
        <div style={{ fontSize: 13.5, color: C.muted }}>You told us</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 20, lineHeight: 1.25, margin: "4px 0 22px" }}>&ldquo;{q}&rdquo;</div>
        {STEPS.map((s, i) => { const done = i < step, active = i === step; return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 13, padding: "10px 0", opacity: done || active ? 1 : .3, transition: "opacity .3s" }}>
            <div style={{ width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", background: done ? C.brand : "transparent", border: done ? "none" : `2px solid ${active ? C.brand : C.line}`, animation: active && !reduce ? "fdpPulse 1s infinite" : "none" }}>{done && <Check size={14} color="#fff" />}</div>
            <span style={{ fontSize: 16, fontWeight: done || active ? 600 : 500, color: done || active ? C.ink : C.muted }}>{s}</span>
          </div>); })}
      </div>)}
      {stage === "results" && !booked && (<div>
        <button className="fdp-btn" onClick={reset} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: C.muted, background: "transparent", border: "none", cursor: "pointer", marginBottom: 14 }}><RotateCcw size={14} /> Start over</button>
        <div className="rise" style={{ display: "flex", gap: 12, alignItems: "flex-start", background: C.brandDeep, color: "#DEE9F7", borderRadius: 16, padding: "16px 18px", marginBottom: 18 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(244,180,60,.2)", display: "grid", placeItems: "center", flexShrink: 0 }}><Sparkles size={16} color={C.gold} /></div>
          <div style={{ fontSize: 15.5, lineHeight: 1.45 }}>{concierge(sig)}</div>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          {ms.map((p, idx) => { const sl = slots(!!sig.urgent, p.id); return (
            <div key={p.id} className="fdp-card rise" style={{ animationDelay: `${idx * 80}ms`, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18, display: "grid", gridTemplateColumns: "1fr auto", gap: 16 }}>
              <div>
                {idx === 0 && <span style={{ display: "inline-block", fontSize: 11.5, fontWeight: 700, color: C.goldDeep, background: C.goldSoft, padding: "3px 9px", borderRadius: 999, marginBottom: 8 }}>BEST MATCH</span>}
                <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 20, letterSpacing: "-.02em" }}>{p.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, color: C.muted, fontSize: 13.5, flexWrap: "wrap" }}>
                  <span>{p.specialty}</span><span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><MapPin size={13} /> {p.city}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: C.ink, fontWeight: 600 }}><Star size={13} fill={C.gold} color={C.gold} /> {p.rating}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
                  {p.reasons.map((r) => <span key={r} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 600, color: C.brand, background: C.sky, padding: "5px 10px", borderRadius: 999 }}><Check size={12} /> {r}</span>)}
                </div>
              </div>
              <div style={{ minWidth: 150, borderLeft: `1px solid ${C.line}`, paddingLeft: 16, display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: C.muted, marginBottom: 9, display: "flex", alignItems: "center", gap: 5 }}><Clock size={13} color={C.brand} /> Next open</div>
                <div style={{ display: "grid", gap: 7 }}>{sl.map((s) => <button key={s} className="fdp-btn fdp-slot" onClick={() => setBooked({ p, s })} style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: C.brand, background: "#fff", border: `1.5px solid ${C.line}`, padding: "9px 10px", borderRadius: 11, cursor: "pointer" }}>{s}</button>)}</div>
              </div>
            </div>); })}
        </div>
      </div>)}
      {booked && (<div className="fade" style={{ textAlign: "center", padding: "16px 6px" }}>
        <div style={{ width: 56, height: 56, borderRadius: 999, background: C.brand, display: "grid", placeItems: "center", margin: "0 auto 16px" }}><CalendarCheck size={28} color="#fff" /></div>
        <h3 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 26, margin: 0, letterSpacing: "-.02em" }}>You&rsquo;re all set.</h3>
        <p style={{ color: C.muted, fontSize: 16, margin: "10px 0 18px" }}>The office has your info and will text a confirmation.</p>
        <div style={{ maxWidth: 380, margin: "0 auto", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, textAlign: "left" }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 }}>{booked.p.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 8, fontWeight: 700, color: C.brand }}><Clock size={15} /> {booked.s}</div>
        </div>
        <button className="fdp-btn" onClick={reset} style={{ marginTop: 18, fontFamily: FONT, fontSize: 14, fontWeight: 600, color: C.muted, background: "transparent", border: "none", cursor: "pointer", display: "inline-flex", gap: 6, alignItems: "center" }}><RotateCcw size={14} /> Try again</button>
      </div>)}
    </div>
  );
}

function PriceEstimator() {
  const prices = { Cleaning: [90, 200], Filling: [150, 450], Crown: [800, 1800], "Root Canal": [700, 1500], Extraction: [180, 600] };
  const [svc, setSvc] = useState("Cleaning"), [zip, setZip] = useState(""), [out, setOut] = useState(null);
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: 24, maxWidth: 620, margin: "0 auto", boxShadow: "0 24px 50px -40px rgba(12,46,90,.4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: C.sky, display: "grid", placeItems: "center" }}><Calculator size={20} color={C.brand} /></div>
        <div><div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 19 }}>Price Estimator</div><div style={{ fontSize: 13, color: C.muted }}>Ballpark what a visit might cost</div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }}>
        <div><label style={{ fontSize: 12.5, fontWeight: 600, color: C.muted }}>Service</label>
          <select value={svc} onChange={(e) => { setSvc(e.target.value); setOut(null); }} className="fdp-btn" style={{ width: "100%", marginTop: 5, fontFamily: FONT, fontSize: 15, padding: "11px 12px", borderRadius: 11, border: `1.5px solid ${C.line}`, background: "#fff", color: C.ink }}>
            {Object.keys(prices).map((k) => <option key={k}>{k}</option>)}</select></div>
        <div><label style={{ fontSize: 12.5, fontWeight: 600, color: C.muted }}>ZIP</label>
          <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="95330" inputMode="numeric" className="fdp-in fdp-btn" style={{ width: "100%", marginTop: 5, fontFamily: FONT, fontSize: 15, padding: "11px 12px", borderRadius: 11, border: `1.5px solid ${C.line}`, background: "#fff", color: C.ink }} /></div>
        <button className="fdp-btn fdp-cta" onClick={() => setOut(prices[svc])} style={{ fontFamily: FONT, fontWeight: 700, fontSize: 15, background: C.brand, color: "#fff", border: "none", borderRadius: 11, padding: "12px 18px", cursor: "pointer" }}>Estimate</button>
      </div>
      {out && <div className="fade" style={{ marginTop: 16, background: C.sky, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: C.muted }}>Estimated range{zip ? ` near ${zip}` : ""}</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, color: C.brandDeep }}>${out[0]} – ${out[1]}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Estimate only · actual cost varies by provider &amp; coverage</div>
      </div>}
    </div>
  );
}

function LeadForm({ kind }) {
  const [done, setDone] = useState(false), [n, setN] = useState(""), [p, setP] = useState("");
  if (done) return <div className="fade" style={{ background: C.sky, borderRadius: 14, padding: 20, textAlign: "center" }}>
    <div style={{ width: 48, height: 48, borderRadius: 999, background: C.brand, display: "grid", placeItems: "center", margin: "0 auto 10px" }}><Check size={24} color="#fff" /></div>
    <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18 }}>Got it{n ? `, ${n.split(" ")[0]}` : ""}!</div>
    <p style={{ color: C.muted, fontSize: 14.5, margin: "6px 0 0" }}>A licensed agent will reach out shortly. (Demo — no real message sent.)</p></div>;
  return <div style={{ display: "grid", gap: 10 }}>
    <input className="fdp-in fdp-btn" value={n} onChange={(e) => setN(e.target.value)} placeholder="Your name" style={{ fontFamily: FONT, fontSize: 15, padding: "12px 14px", borderRadius: 11, border: `1.5px solid ${C.line}`, background: "#fff", color: C.ink }} />
    <input className="fdp-in fdp-btn" value={p} onChange={(e) => setP(e.target.value)} placeholder="Phone number" inputMode="tel" style={{ fontFamily: FONT, fontSize: 15, padding: "12px 14px", borderRadius: 11, border: `1.5px solid ${C.line}`, background: "#fff", color: C.ink }} />
    <button className="fdp-btn fdp-cta" onClick={() => setDone(true)} style={{ fontFamily: FONT, fontWeight: 700, fontSize: 15.5, background: C.gold, color: C.brandDeep, border: "none", borderRadius: 12, padding: "13px", cursor: "pointer" }}>{kind === "life" ? "Request my free review" : "Have an agent call me"}</button>
  </div>;
}

export default function App() {
  const [page, setPage] = useState("home");
  const [menu, setMenu] = useState(false);
  const nav = [["home", "Home"], ["find", "Find a Dentist"], ["covered", "Get Covered"], ["dentists", "For Dentists"], ["programs", "Programs"], ["about", "About"]];
  const go = (p) => { setPage(p); setMenu(false); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" }); };
  const cats = [["General", Smile], ["Family", Users], ["Pediatric", Baby], ["Cosmetic", Sparkles], ["Oral Surgery", Scissors], ["Emergency", Activity]];
  const eyebrow = (Icon, txt) => <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: C.brand }}><Icon size={15} /> {txt}</span>;

  return (
    <div style={{ background: C.bg, color: C.ink, fontFamily: FONT, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;}
        .fdp-btn:focus-visible,.fdp-chip:focus-visible,.fdp-in:focus-visible,.fdp-slot:focus-visible{outline:3px solid ${C.gold};outline-offset:2px;}
        .fdp-in::placeholder{color:#9BAAC4;}
        @keyframes fdpRise{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
        @keyframes fdpFade{from{opacity:0;}to{opacity:1;}}
        @keyframes fdpPulse{0%,100%{opacity:.35;}50%{opacity:1;}}
        @keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        .rise{animation:fdpRise .5s cubic-bezier(.2,.7,.2,1) both;}
        .fade{animation:fdpFade .4s ease both;}
        @media (prefers-reduced-motion:reduce){.rise,.fade,.floaty{animation:none!important;}}
        .fdp-card{transition:transform .18s,box-shadow .18s,border-color .18s;}
        .fdp-card:hover{transform:translateY(-3px);box-shadow:0 18px 40px -22px rgba(12,46,90,.4);border-color:${C.brand};}
        .fdp-slot{transition:background .15s,color .15s,border-color .15s;}
        .fdp-slot:hover{background:${C.brand};color:#fff;border-color:${C.brand};}
        .fdp-cta{transition:transform .15s,filter .15s;}
        .fdp-cta:hover{transform:translateY(-1px);filter:brightness(1.05);}
        .fdp-chip:hover{background:${C.sky};border-color:${C.brand};}
        .navlink{background:none;border:none;cursor:pointer;font-family:${FONT};font-size:14.5px;font-weight:600;color:${C.muted};transition:color .15s;padding:6px 2px;}
        .navlink:hover,.navlink.on{color:${C.brand};}
        .wrap{max-width:1080px;margin:0 auto;padding:0 22px;}
        .cat{transition:transform .16s,border-color .16s;}
        .cat:hover{transform:translateY(-3px);border-color:${C.brand};}
        @media(max-width:860px){.desktop-nav{display:none!important;}.mob-toggle{display:block!important;}.hero-grid{grid-template-columns:1fr!important;}.split{grid-template-columns:1fr!important;}}
      `}</style>

      {/* HEADER */}
      <header style={{ borderBottom: `1px solid ${C.line}`, background: "rgba(246,248,251,.92)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 40 }}>
        <div className="wrap" style={{ padding: "13px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          <button onClick={() => go("home")} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer" }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: C.brand, display: "grid", placeItems: "center" }}><Sparkles size={18} color={C.gold} /></div>
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, letterSpacing: "-.02em", color: C.ink }}>Find Dental Providers</span>
          </button>
          <nav style={{ display: "flex", alignItems: "center", gap: 20 }} className="desktop-nav">
            {nav.map(([k, l]) => <button key={k} className={"navlink" + (page === k ? " on" : "")} onClick={() => go(k)}>{l}</button>)}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: C.brand, display: "flex", alignItems: "center", gap: 6 }}><Phone size={14} /> 877-DDS-DOCS</span>
            <button className="mob-toggle" onClick={() => setMenu(!menu)} style={{ display: "none", background: "none", border: "none", cursor: "pointer", color: C.ink }}>{menu ? <X size={22} /> : <Menu size={22} />}</button>
          </div>
        </div>
        {menu && <div className="wrap" style={{ paddingBottom: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          {nav.map(([k, l]) => <button key={k} className={"navlink" + (page === k ? " on" : "")} onClick={() => go(k)} style={{ textAlign: "left", padding: "10px 2px", fontSize: 16 }}>{l}</button>)}</div>}
      </header>

      {/* ---------- HOME ---------- */}
      {page === "home" && <div className="fade">
        {/* HERO with image */}
        <section style={{ position: "relative", overflow: "hidden", background: `radial-gradient(120% 130% at 90% -10%, ${C.brand2} 0%, ${C.brand} 42%, ${C.brandDeep} 100%)`, color: "#fff" }}>
          <div style={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", background: "rgba(244,180,60,.16)", top: -80, right: -60, filter: "blur(10px)" }} className="floaty" />
          <div className="wrap hero-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 44, alignItems: "center", padding: "62px 22px 66px", position: "relative" }}>
            <div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: C.gold, background: "rgba(244,180,60,.14)", padding: "7px 14px", borderRadius: 999 }}><Sparkles size={14} /> California&rsquo;s dental care, matched to you</span>
              <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: "clamp(34px,5.6vw,58px)", lineHeight: 1.03, letterSpacing: "-.03em", margin: "18px 0 0" }}>Tell us what&rsquo;s going on. We&rsquo;ll find your dentist and book it.</h1>
              <p style={{ fontSize: 18, color: "#CFE0F5", maxWidth: "42ch", margin: "16px 0 26px", lineHeight: 1.5 }}>No lists to dig through. Say it in your own words — insurance, budget, nerves and all — and we get you in the chair.</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button className="fdp-btn fdp-cta" onClick={() => go("find")} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.gold, color: C.brandDeep, border: "none", fontFamily: FONT, fontWeight: 700, fontSize: 17, padding: "15px 26px", borderRadius: 13, cursor: "pointer" }}>Find my dentist <ArrowRight size={19} /></button>
                <button className="fdp-btn" onClick={() => go("covered")} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.1)", color: "#fff", border: "1px solid rgba(255,255,255,.28)", fontFamily: FONT, fontWeight: 700, fontSize: 17, padding: "15px 26px", borderRadius: 13, cursor: "pointer" }}>Get covered</button>
              </div>
            </div>
            <div style={{ position: "relative" }}>
              <Photo src={IMG.hero} alt="Smiling patient at the dentist" ratio="4/5" radius={22} fallback={3} style={{ boxShadow: "0 40px 80px -40px rgba(0,0,0,.5)" }} />
              <div className="floaty" style={{ position: "absolute", bottom: 18, left: -18, background: "#fff", color: C.ink, borderRadius: 14, padding: "12px 16px", boxShadow: "0 20px 40px -20px rgba(0,0,0,.4)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: C.sky, display: "grid", placeItems: "center" }}><CalendarCheck size={18} color={C.brand} /></div>
                <div><div style={{ fontWeight: 700, fontSize: 14, fontFamily: DISPLAY }}>Booked in 30 sec</div><div style={{ fontSize: 12, color: C.muted }}>Maria · cleaning · today</div></div>
              </div>
            </div>
          </div>
        </section>

        {/* three things */}
        <section style={{ padding: "56px 0" }}>
          <div className="wrap" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18 }}>
            {[[Search, "Find a dentist", "Type your situation — insurance, budget, nerves and all — and we match & book you.", "find"],
              [Shield, "Get covered", "No plan? A licensed agent finds you affordable dental — and family benefits.", "covered"],
              [CreditCard, "Get help paying", "Financing options so cost never keeps you out of the chair.", "covered"]].map(([Ic, t, b, pg]) => (
              <button key={t} className="fdp-card" onClick={() => go(pg)} style={{ textAlign: "left", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: 24, cursor: "pointer" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: C.sky, display: "grid", placeItems: "center", marginBottom: 14 }}><Ic size={22} color={C.brand} /></div>
                <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 20 }}>{t}</div>
                <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.5, margin: "8px 0 0" }}>{b}</p>
              </button>))}
          </div>
        </section>

        {/* COMMUNITY band (image + copy) */}
        <section style={{ padding: "20px 0 60px" }}>
          <div className="wrap split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
            <Photo src={IMG.community} alt="A diverse family smiling together" ratio="5/4" radius={22} fallback={0} overlay={`linear-gradient(160deg, transparent 55%, rgba(12,46,90,.28))`} />
            <div>
              {eyebrow(HeartHandshake, "Care for everyone")}
              <h2 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: "clamp(26px,3.8vw,38px)", letterSpacing: "-.02em", lineHeight: 1.05, margin: "12px 0 14px" }}>Built for the families the system overlooks.</h2>
              <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.6 }}>Medi-Cal, uninsured, Spanish-speaking, special-needs, first-timers — everyone deserves a dentist who fits. We help you find one who takes your coverage and treats you right.</p>
              <div style={{ display: "flex", gap: 22, marginTop: 20, flexWrap: "wrap" }}>
                {[["Se habla español", Users], ["Medi-Cal friendly", Shield], ["No judgment", Smile]].map(([t, Ic]) => (
                  <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 14.5, fontWeight: 600, color: C.brand }}><Ic size={16} /> {t}</span>))}
              </div>
            </div>
          </div>
        </section>

        {/* categories */}
        <section style={{ padding: "10px 0 56px" }}>
          <div className="wrap">
            <h2 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: "clamp(24px,3.5vw,34px)", textAlign: "center", letterSpacing: "-.02em" }}>Explore popular categories</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginTop: 26 }}>
              {cats.map(([t, Ic]) => (
                <button key={t} className="cat fdp-btn" onClick={() => go("find")} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: "22px 14px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <Ic size={26} color={C.brand} /><span style={{ fontWeight: 600, fontSize: 15 }}>{t}</span></button>))}
            </div>
          </div>
        </section>

        {/* estimator */}
        <section style={{ padding: "56px 0", background: C.surface, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
          <div className="wrap">
            <h2 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: "clamp(24px,3.5vw,34px)", textAlign: "center", letterSpacing: "-.02em", marginBottom: 8 }}>Curious what a visit costs?</h2>
            <p style={{ textAlign: "center", color: C.muted, marginBottom: 26 }}>Get a quick ballpark before you book.</p>
            <PriceEstimator />
          </div>
        </section>

        {/* testimonial */}
        <section style={{ padding: "56px 0" }}>
          <div className="wrap" style={{ maxWidth: 760, textAlign: "center" }}>
            <Quote size={34} color={C.gold} />
            <p style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: "clamp(20px,3vw,28px)", lineHeight: 1.35, letterSpacing: "-.01em", margin: "14px 0 18px" }}>&ldquo;I have Medi-Cal and thought I&rsquo;d never afford a crown. They found me a plan and a dentist the same day.&rdquo;</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
              <Photo src={IMG.smile} alt="Happy patient" radius={999} style={{ width: 48, height: 48 }} fallback={1} />
              <div style={{ textAlign: "left" }}><div style={{ fontWeight: 700 }}>Maria R.</div><div style={{ fontSize: 13.5, color: C.muted }}>Stockton, CA</div></div>
            </div>
          </div>
        </section>

        {/* trust strip */}
        <section style={{ padding: "10px 0 56px" }}>
          <div className="wrap" style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            {["WBENC Certified", "Minority Business Enterprise", "CA Small Business", "SAM.gov Registered"].map((b) => (
              <span key={b} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 600, color: C.brand, background: C.sky, padding: "9px 15px", borderRadius: 999 }}><BadgeCheck size={15} color={C.brand} /> {b}</span>))}
          </div>
        </section>
      </div>}

      {/* ---------- FIND ---------- */}
      {page === "find" && <div className="fade"><section style={{ padding: "48px 0 70px" }}><div className="wrap">
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 30px" }}>
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: "clamp(30px,5vw,48px)", letterSpacing: "-.03em", lineHeight: 1.05 }}>Find your dentist</h1>
          <p style={{ fontSize: 17.5, color: C.muted, marginTop: 14 }}>Tell us what&rsquo;s going on and we&rsquo;ll match you with the right office — then book it.</p>
        </div>
        <div style={{ maxWidth: 880, margin: "0 auto" }}><BookingDemo /></div>
        <p style={{ textAlign: "center", fontSize: 12.5, color: C.muted, marginTop: 16 }}>Live demo · sample California providers</p>
      </div></section></div>}

      {/* ---------- GET COVERED ---------- */}
      {page === "covered" && <div className="fade"><section style={{ padding: "48px 0 70px" }}><div className="wrap">
        <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center", marginBottom: 40 }}>
          <div>
            {eyebrow(Shield, "Coverage & benefits")}
            <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: "clamp(30px,5vw,46px)", letterSpacing: "-.03em", lineHeight: 1.05, margin: "12px 0 0" }}>Get covered — talk to a licensed agent, free.</h1>
            <p style={{ fontSize: 17.5, color: C.muted, marginTop: 14, lineHeight: 1.55 }}>No pressure, no cost. A licensed agent helps you find affordable dental coverage that actually covers the big stuff — even what Medi-Cal won&rsquo;t.</p>
          </div>
          <Photo src={IMG.momChild} alt="Mother and child smiling" ratio="4/3" radius={22} fallback={2} overlay={`linear-gradient(160deg, transparent 60%, rgba(12,46,90,.25))`} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18, maxWidth: 820, margin: "0 auto" }}>
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: 26 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.sky, display: "grid", placeItems: "center", marginBottom: 12 }}><Smile size={22} color={C.brand} /></div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 20 }}>Dental coverage</div>
            <p style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.5, margin: "8px 0 16px" }}>Individual and family dental plans that fit your budget and your dentist.</p>
            <LeadForm kind="dental" />
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: 26 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.goldSoft, display: "grid", placeItems: "center", marginBottom: 12 }}><HeartHandshake size={22} color={C.goldDeep} /></div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 20 }}>Life &amp; living benefits</div>
            <p style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.5, margin: "8px 0 16px" }}>Protect your family with a free, no-obligation benefits review.</p>
            <LeadForm kind="life" />
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: 12.5, color: C.muted, marginTop: 20 }}>Demo form · connects to your licensed agent</p>
      </div></section></div>}

      {/* ---------- FOR DENTISTS ---------- */}
      {page === "dentists" && <div className="fade"><section style={{ padding: "48px 0 70px" }}><div className="wrap split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
        <div>
          {eyebrow(Stethoscope, "For dentists")}
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: "clamp(28px,4.4vw,44px)", letterSpacing: "-.03em", lineHeight: 1.05, margin: "12px 0 0" }}>Pay for patients in your chair — not a listing.</h1>
          <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.55, margin: "16px 0" }}>We send you booked patients that match what you do. Start free — you don&rsquo;t pay until a patient shows up.</p>
          {["No upfront cost — pay per booked patient", "Flat monthly plan once it's working", "Fill the empty slots that cost you money"].map((t) => (
            <div key={t} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", fontSize: 15.5, fontWeight: 500 }}><span style={{ width: 22, height: 22, borderRadius: 999, background: C.sky, display: "grid", placeItems: "center", flexShrink: 0 }}><Check size={13} color={C.brand} /></span>{t}</div>))}
          <button className="fdp-btn fdp-cta" style={{ marginTop: 18, background: C.brand, color: "#fff", border: "none", fontFamily: FONT, fontWeight: 700, fontSize: 15.5, padding: "13px 22px", borderRadius: 12, cursor: "pointer" }}>List your practice</button>
        </div>
        <div>
          <Photo src={IMG.dentist} alt="Dentist with a patient" ratio="4/3" radius={20} fallback={3} style={{ marginBottom: 16 }} overlay={`linear-gradient(160deg, transparent 60%, rgba(12,46,90,.2))`} />
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: 18, boxShadow: "0 24px 50px -40px rgba(12,46,90,.4)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontFamily: DISPLAY, fontSize: 15 }}><LayoutDashboard size={16} color={C.brand} /> Your dashboard</div>
              <span style={{ fontSize: 12, color: C.muted }}>This month</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: C.bg, borderRadius: 14, padding: 12 }}><div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 26, color: C.brand }}>34</div><div style={{ fontSize: 12.5, color: C.muted }}>patients booked</div></div>
              <div style={{ background: C.bg, borderRadius: 14, padding: 12 }}><div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 26, color: C.brand }}>$2,040</div><div style={{ fontSize: 12.5, color: C.muted }}>34 × $60</div></div>
            </div>
          </div>
        </div>
      </div></section></div>}

      {/* ---------- PROGRAMS ---------- */}
      {page === "programs" && <div className="fade"><section style={{ padding: "48px 0 70px" }}><div className="wrap">
        <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
          {eyebrow(HeartHandshake, "For employers, unions & agencies")}
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: "clamp(28px,4.4vw,44px)", letterSpacing: "-.03em", lineHeight: 1.05, margin: "12px 0 0" }}>Dental-access programs for your people.</h1>
          <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.55, marginTop: 14 }}>A certified partner that brings dental care to your workforce or community — you don&rsquo;t lift a finger.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16, marginTop: 36 }}>
          {[[Truck, "On-site dental days", "Screenings & cleanings brought to a worksite or community center."],
            [Building2, "Benefits enrollment", "We run your dental enrollment start to finish — HR relaxes."],
            [GraduationCap, "Oral health workshops", "Education for employees, families, and kids."],
            [Stethoscope, "Dental navigation", "The resource your people call to find care & understand coverage."]].map(([Ic, t, b]) => (
            <div key={t} className="fdp-card" style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: C.sky, display: "grid", placeItems: "center", marginBottom: 14 }}><Ic size={21} color={C.brand} /></div>
              <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18 }}>{t}</div>
              <p style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.5, margin: "8px 0 0" }}>{b}</p></div>))}
        </div>
      </div></section></div>}

      {/* ---------- ABOUT ---------- */}
      {page === "about" && <div className="fade"><section style={{ padding: "48px 0 70px" }}><div className="wrap split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
        <div>
          {eyebrow(Sparkles, "About us")}
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: "clamp(28px,4.6vw,44px)", letterSpacing: "-.03em", lineHeight: 1.05, margin: "12px 0 16px" }}>Built to reach the people the system leaves behind.</h1>
          <p style={{ fontSize: 17.5, color: C.ink, lineHeight: 1.6 }}>Find Dental Providers connects California families to dental care that fits their coverage, their budget, and their lives — especially the families other platforms overlook. We&rsquo;re a certified, women- and minority-owned company built on nearly 30 years of dental and health-benefits experience.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, margin: "24px 0" }}>
            {[["30+ yrs", "in dental & benefits"], ["Certified", "WBENC · MBE"], ["California", "underserved access"]].map(([a, b]) => (
              <div key={a} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16 }}>
                <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 22, color: C.brand }}>{a}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{b}</div></div>))}
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 20 }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, marginBottom: 10 }}>Get in touch</div>
            <div style={{ display: "grid", gap: 9, fontSize: 15 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}><PhoneCall size={16} color={C.brand} /> 877-DDS-DOCS</span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Mail size={16} color={C.brand} /> customerservice@finddentalproviders.com</span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}><MapPin size={16} color={C.brand} /> Lathrop, CA 95330</span>
            </div>
          </div>
        </div>
        <Photo src={IMG.family} alt="A joyful family" ratio="4/5" radius={22} fallback={0} overlay={`linear-gradient(160deg, transparent 55%, rgba(12,46,90,.3))`} />
      </div></section></div>}

      {/* FOOTER */}
      <footer style={{ background: C.brandDeep, color: "#CFE0F5" }}>
        <div className="wrap" style={{ padding: "40px 22px 28px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 30, justifyContent: "space-between" }}>
            <div style={{ maxWidth: 300 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: C.brand, display: "grid", placeItems: "center" }}><Sparkles size={16} color={C.gold} /></div>
                <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, color: "#fff" }}>Find Dental Providers</span></div>
              <p style={{ fontSize: 14, lineHeight: 1.5 }}>Connecting California to dental care that actually fits — booked in about 30 seconds.</p>
            </div>
            <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
              <div><div style={{ fontWeight: 700, color: "#fff", fontSize: 14, marginBottom: 10 }}>Explore</div>
                {nav.map(([k, l]) => <button key={k} onClick={() => go(k)} style={{ display: "block", background: "none", border: "none", color: "#CFE0F5", cursor: "pointer", fontFamily: FONT, fontSize: 14, padding: "4px 0", textAlign: "left" }}>{l}</button>)}</div>
              <div><div style={{ fontWeight: 700, color: "#fff", fontSize: 14, marginBottom: 10 }}>Contact</div>
                <div style={{ fontSize: 14, lineHeight: 1.8 }}>877-DDS-DOCS<br />Lathrop, CA<br />customerservice@<br />finddentalproviders.com</div></div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,.15)", marginTop: 26, paddingTop: 18, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, fontSize: 13 }}>
            <span>© 2026 Find Dental Providers · California</span>
            <span>Patients book free · Dentists pay for booked visits, not listings</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
