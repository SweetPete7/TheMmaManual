import { useState, useEffect } from "react";

// ── FIREBASE ───────────────────────────────────────────────────
const FIREBASE_URL = "https://themmamanual-471a4-default-rtdb.firebaseio.com";

// Simple Firebase REST helpers — no npm needed
const fbGet  = async (path) => { try { const r = await fetch(`${FIREBASE_URL}/${path}.json`); return r.ok ? await r.json() : null; } catch { return null; } };
const fbSet  = async (path, data) => { try { await fetch(`${FIREBASE_URL}/${path}.json`, { method:"PUT",  body: JSON.stringify(data) }); } catch {} };
const fbPush = async (path, data) => { try { const r = await fetch(`${FIREBASE_URL}/${path}.json`, { method:"POST", body: JSON.stringify(data) }); return r.ok ? (await r.json()).name : null; } catch { return null; } };
const fbPatch= async (path, data) => { try { await fetch(`${FIREBASE_URL}/${path}.json`, { method:"PATCH", body: JSON.stringify(data) }); } catch {} };
const fbListen = (path, cb) => {
  const url = `${FIREBASE_URL}/${path}.json`;
  let timeout;
  const poll = async () => { const d = await fbGet(path); cb(d); timeout = setTimeout(poll, 2000); };
  poll();
  return () => clearTimeout(timeout);
};

// ── STRIPE ─────────────────────────────────────────────────────
const STRIPE_PK = "pk_test_51ToWLlR54vHjG4vzxsS6DIFLaghTwH5eIMFwWHUCS9PNF2f68OGJY4k0eYKSOLCEZIgB2nrXcY23pi9t3AOWNvKu00hLJY8EBD";
let stripeInstance = null;
const loadStripe = () => new Promise((resolve) => {
  if (stripeInstance) return resolve(stripeInstance);
  if (window.Stripe) { stripeInstance = window.Stripe(STRIPE_PK); return resolve(stripeInstance); }
  const script = document.createElement("script");
  script.src = "https://js.stripe.com/v3/";
  script.onload = () => { stripeInstance = window.Stripe(STRIPE_PK); resolve(stripeInstance); };
  document.head.appendChild(script);
});

// ── BRAND COLOURS ─────────────────────────────────────────────
const C = {
  pink:   "#FF1493",
  cyan:   "#00CFFF",
  gold:   "#FFD700",
  green:  "#00E676",
  black:  "#0A0A0A",
  card:   "#141414",
  card2:  "#1C1C1C",
  white:  "#FFFFFF",
  gray:   "#888888",
  border: "rgba(255,255,255,0.08)",
};

// ── YOUTUBE HELPERS ────────────────────────────────────────────
function getYTEmbed(url) {
  if (!url) return null;
  let id = null;
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") id = u.pathname.slice(1).split("?")[0];
    else if (u.pathname.includes("/shorts/")) id = u.pathname.split("/shorts/")[1].split("?")[0];
    else id = u.searchParams.get("v");
  } catch (_) {}
  return id;
}
function getYTThumb(url) {
  const id = getYTEmbed(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

// ── FUZZY SEARCH ───────────────────────────────────────────────
// Matches if every word the user typed appears (as a substring) somewhere
// in the title — so "rear naked choke" matches "PROPER REAR NAKED CHOKE"
// and a single word like "choke" matches anything containing it, regardless
// of word order or exact spelling of the full title.
function fuzzyMatch(title, query) {
  if (!query.trim()) return false;
  const t = title.toLowerCase();
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return words.every(w => t.includes(w));
}

// ── STRUCTURE ──────────────────────────────────────────────────
// Each discipline has offense & defense, each with sub-sections
const DISCIPLINES = {
  standup: {
    label: "STANDUP",
    icon: "🥊",
    color: C.pink,
    gradient: `linear-gradient(135deg, rgba(255,20,147,0.45), rgba(140,0,80,0.7), #0A0A0A)`,
    subs: [
      { id: "boxing",     name: "BOXING",     icon: "🥊", color: C.pink },
      { id: "kickboxing", name: "KICKBOXING", icon: "🦵", color: C.pink },
      { id: "muaythai",  name: "MUAY THAI",  icon: "🏆", color: C.pink },
      { id: "mma_stand", name: "MMA",        icon: "⚡", color: C.pink },
    ],
  },
  ground: {
    label: "GROUND",
    icon: "🤼",
    color: C.cyan,
    gradient: `linear-gradient(135deg, rgba(0,207,255,0.4), rgba(0,100,160,0.65), #0A0A0A)`,
    subs: [
      { id: "bjj",       name: "BJJ",        icon: "🥋", color: C.cyan },
      { id: "wrestling", name: "WRESTLING",  icon: "💪", color: C.cyan },
      { id: "judo",      name: "JUDO",       icon: "🎯", color: C.cyan },
      { id: "mma_ground",name: "MMA",        icon: "⚡", color: C.cyan },
    ],
  },
  bestmma: {
    label: "MMA TECHNIQUES",
    icon: "🏅",
    color: C.gold,
    gradient: `linear-gradient(135deg, rgba(255,215,0,0.4), rgba(180,120,0,0.6), #0A0A0A)`,
    subs: [
      { id: "grappling_arts",  name: "GRAPPLING ARTS",  icon: "🤼", color: C.gold },
      { id: "striking_arts",   name: "STRIKING ARTS",   icon: "🥊", color: C.gold },
      { id: "all_arts",        name: "ALL THE ARTS",    icon: "🏆", color: C.gold },
    ],
  },
  drills: {
    label: "DRILLS",
    icon: "🧩",
    color: "#9B5CFF",
    gradient: `linear-gradient(135deg, rgba(155,92,255,0.4), rgba(90,40,180,0.6), #0A0A0A)`,
    subs: [
      { id: "mma_drills",       name: "MMA DRILLS",       icon: "⚡", color: "#9B5CFF" },
      { id: "striking_drills",  name: "STRIKING DRILLS",  icon: "🥊", color: "#9B5CFF" },
      { id: "grappling_drills", name: "GRAPPLING DRILLS", icon: "🤼", color: "#9B5CFF" },
    ],
  },
  fighters: {
    label: "UFC & BJJ FIGHTERS",
    icon: "🌟",
    color: "#CC0000",
    gradient: `linear-gradient(135deg, rgba(204,0,0,0.45), rgba(100,0,0,0.7), #0A0A0A)`,
    subs: [
      { id: "ufc_fighters",     name: "UFC FIGHTERS",    icon: "🏆", color: "#CC0000" },
      { id: "bjj_fighters",     name: "BJJ FIGHTERS",    icon: "🥋", color: C.cyan },
      { id: "boxing_fighters",  name: "BOXERS",          icon: "🥊", color: C.pink },
    ],
  },
};

// Offense/Defense sub-sections per discipline
const SECTIONS = {
  boxing:     { offense: ["Punches & Combos", "Footwork & Angles"],      defense: ["Guard & Blocking", "Head Movement", "Footwork"] },
  kickboxing: { offense: ["Kicks & Combos", "Clinch & Knees"],           defense: ["Checking Kicks", "Guard & Blocking", "Footwork"] },
  muaythai:   { offense: ["Strikes & Combos", "Clinch & Elbows"],        defense: ["Guard & Blocking", "Footwork", "Teep & Push Kicks"] },
  mma_stand:  { offense: ["Striking Combos", "Clinch & Dirty Boxing"],   defense: ["Striking Defence", "Cage Control", "Footwork"] },
  bjj:        { offense: ["Submissions", "Guard Play & Sweeps", "Leg Locks"],  defense: ["Guard", "Sweeps & Escaping Submissions", "Leg Locks"] },
  wrestling:  { offense: ["Takedowns", "Control & Pinning"],             defense: ["Takedown Defence", "Scrambles & Footwork"] },
  judo:       { offense: ["Throws", "Grip Fighting"],                    defense: ["Counters", "Break Falls & Posture", "Grips"] },
  mma_ground: { offense: ["Ground & Pound", "Submissions"],              defense: ["Ground Defence", "Getting Up"] },
  grappling_arts: { offense: ["Videos"],  defense: [] },
  striking_arts:  { offense: ["Videos"],  defense: [] },
  all_arts:       { offense: ["Videos"],  defense: [] },
  ufc_fighters:   { offense: ["Videos"],  defense: [] },
  bjj_fighters:   { offense: ["Videos"],  defense: [] },
  boxing_fighters:{ offense: ["Videos"],  defense: [] },
  mma_drills:       { offense: ["Videos"], defense: [] },
  striking_drills:  { offense: ["Videos"], defense: [] },
  grappling_drills: { offense: ["Videos"], defense: [] },
};

// Video storage: disciplineId -> "offense"|"defense" -> sectionName -> [...videos]
const INITIAL_VIDEOS = {
  boxing: {
    offense: { "Punches & Combos": [
      { title: "HOW TO THROW THE PERFECT JAB", youtubeUrl: "https://youtu.be/71nmi6nGcrY?si=eA31HI_xLBwwBWLa", by: "@coach_mma" },
      { title: "HOW TO THROW A PERFECT JAB", youtubeUrl: "https://youtube.com/shorts/BkTWWuN5fVY?si=0AzrDVaVY57QFQfl", by: "@coach_mma" },
      { title: "MASTERING THE 1-2", youtubeUrl: "https://youtube.com/shorts/-hy2QLE567o?si=Ww7nTiqXxiLJSUh1", by: "@coach_mma" },
      { title: "MASTERING STRAIGHTS & CROSSES", youtubeUrl: "https://youtube.com/shorts/kQhk8kOYAoQ?si=4cLxSh95ahNLjC0E", by: "@coach_mma" },
      { title: "HOW TO GET EXPLOSIVE PUNCHES!", youtubeUrl: "https://youtube.com/shorts/j5JKBFkdAMc?si=jjB_jbeuH7AdgBzZ", by: "@coach_mma" },
      { title: "UPPERCUT FEINT", youtubeUrl: "https://youtu.be/0URSrW471o4?si=tyUmW7wH7-Wbs-xd", by: "@coach_mma" },
      { title: "JAB CROSS COMBO", by: "@coach_mma" },
      { title: "HOOK TO THE BODY", by: "@coach_mma" },
      { title: "HOW TO THROW A LEAD QUESTION MARK KICK WITH LUKE ROCKHOLD", youtubeUrl: "https://youtube.com/shorts/_VTESrnObqM?si=v8qLR5ijEyNSURYq", by: "@coach_mma" },
    ], "Footwork & Angles": [
      { title: "4 NECESSARY FOOTWORK DRILLS", youtubeUrl: "https://youtube.com/shorts/Gt1W0B3Rg_Y?si=tub9IjddjAfFYjED", by: "@coach_mma" },
      { title: "3 PRACTICAL FOOTWORK BEGINNER DRILLS", youtubeUrl: "https://youtube.com/shorts/frX41U80vLU?si=AVlI0M86uZs80QjP", by: "@coach_mma" },
      { title: "THE L STEP", youtubeUrl: "https://youtube.com/shorts/C9Q9XySC3QA?si=zmv_QPlzs2ocxDW5", by: "@coach_mma" },
      { title: "3 BASIC FOOTWORK DRILLS!", youtubeUrl: "https://youtube.com/shorts/OpsYWyKpqhQ?si=4JlE99Qg22oeLV7Z", by: "@coach_mma" },
      { title: "HOW TO IMPROVE YOUR FOOTWORK", youtubeUrl: "https://youtube.com/shorts/7xxr6UikKA0?si=5zqgtlsKJVGx8qeL", by: "@coach_mma" },
      { title: "2 BASIC BOXING FOOTWORK STEPS FROM SOUTHPAW", youtubeUrl: "https://youtube.com/shorts/2hJA0Xvnq3c?si=bmj8JVOnga_zz34Z", by: "@coach_mma" },
    ] },
    defense: { "Guard & Blocking": [
      { title: "BASIC BOXING BLOCKING", youtubeUrl: "https://youtube.com/shorts/a4q7BwRk59I?si=-H0QpjcNYDkJRfz_", by: "@coach_mma" },
      { title: "BLOCKING THE BODY WITH TERRANCE CRAWFORD", youtubeUrl: "https://youtube.com/shorts/8sqGeMGZdA4?si=FvUTFO6jOpJjJpMJ", by: "@coach_mma" },
      { title: "CATCHING & BLOCKING THE 1-2", youtubeUrl: "https://youtube.com/shorts/j9vreXOJcso?si=9PaMXx-Rak2TwVCq", by: "@coach_mma" },
      { title: "BOXING BLOCKING VS PARRYING", youtubeUrl: "https://youtube.com/shorts/uJAgJfjvICM?si=qfmprV_778s7Z9i-", by: "@coach_mma" },
    ], "Head Movement": [
      { title: "SLIPPING PUNCHES", by: "@coach_mma" },
      { title: "HOW TO SLIP PUNCHES", youtubeUrl: "https://youtube.com/shorts/3lawJ1dO0Mk?si=0ECeVd732ojIk8mV", by: "@coach_mma" },
      { title: "SLIPPING & ROLLING PUNCHES", youtubeUrl: "https://youtube.com/shorts/QicjOsJlVzQ?si=fi5pvgO5c4OHrH-C", by: "@coach_mma" },
      { title: "HEAD MOVEMENT WITH TEAR DROP BAG DRILL", youtubeUrl: "https://youtube.com/shorts/SJ-rwj4DCVM?si=SCGbr5EFR6owMcKQ", by: "@coach_mma" },
    ], "Footwork": [
      { title: "BASIC BOXING FOOTWORK DRILL", youtubeUrl: "https://youtube.com/shorts/TJEgxaWWOuo?si=PV8THNjQ55gGhDN-", by: "@coach_mma" },
      { title: "3 BASIC FOOTWORK DRILLS!", youtubeUrl: "https://youtube.com/shorts/OpsYWyKpqhQ?si=4JlE99Qg22oeLV7Z", by: "@coach_mma" },
      { title: "HOW TO IMPROVE YOUR FOOTWORK", youtubeUrl: "https://youtube.com/shorts/7xxr6UikKA0?si=5zqgtlsKJVGx8qeL", by: "@coach_mma" },
      { title: "2 BASIC BOXING FOOTWORK STEPS FROM SOUTHPAW", youtubeUrl: "https://youtube.com/shorts/2hJA0Xvnq3c?si=bmj8JVOnga_zz34Z", by: "@coach_mma" },
    ] },
  },
  kickboxing: {
    offense: { "Kicks & Combos": [
      { title: "KICKBOXING'S JAB", youtubeUrl: "https://youtu.be/7PGEGcTHHmg?si=rNcrgdJY9N90S330", by: "@coach_mma" },
      { title: "KICKBOXING'S STRAIGHT PUNCH", youtubeUrl: "https://youtu.be/oyZIQQnzR8c?si=ang_oSDzPqAQrrvz", by: "@coach_mma" },
      { title: "HOW TO GET EXPLOSIVE PUNCHES!", youtubeUrl: "https://youtube.com/shorts/j5JKBFkdAMc?si=jjB_jbeuH7AdgBzZ", by: "@coach_mma" },
      { title: "UPPERCUT FEINT", youtubeUrl: "https://youtu.be/0URSrW471o4?si=tyUmW7wH7-Wbs-xd", by: "@coach_mma" },
      { title: "HOW TO THROW A LEAD QUESTION MARK KICK WITH LUKE ROCKHOLD", youtubeUrl: "https://youtube.com/shorts/_VTESrnObqM?si=v8qLR5ijEyNSURYq", by: "@coach_mma" },
      { title: "ROUND HOUSE KICK", youtubeUrl: "https://youtube.com/shorts/GHKJeN0mFcU?si=6OMl4kNhtZv40j3G", by: "@coach_mma" },
      { title: "ROUNDHOUSE KICK", by: "@coach_mma" },
      { title: "SWITCH KICK DRILL", by: "@grappleking" },
    ], "Clinch & Knees": [
      { title: "KICKBOXING KNEE", youtubeUrl: "https://youtube.com/shorts/Ms65vg_X0_s?si=9SyamDdy23ckzED1", by: "@coach_mma" },
      { title: "KICKBOXING VS MUAY THAI CLINCH", youtubeUrl: "https://youtube.com/shorts/nufhHhUSOgQ?si=qdpJrYp1iTSEOTej", by: "@coach_mma" },
      { title: "5 KNEES FROM CLINCH", youtubeUrl: "https://youtube.com/shorts/Xkv8Z5hp77w?si=dXiJhV0JlhrosoPW", by: "@coach_mma" },
      { title: "KNEE BUMP OFF BALANCE IN CLINCH", youtubeUrl: "https://youtube.com/shorts/U13ZLkb2o1Y", by: "@coach_mma" },
      { title: "CLINCH ENTRY & LOCK", youtubeUrl: "https://youtube.com/shorts/vwNJbYPwZQ0", by: "@coach_mma" },
      { title: "STEP AND PIVOT KNEE IN CLINCH", youtubeUrl: "https://youtube.com/shorts/3Z6mgrCVKyM", by: "@coach_mma" },
    ] },
    defense: { "Checking Kicks": [
      { title: "CHECKING LEG KICK PROPERLY", youtubeUrl: "https://youtube.com/shorts/nQHJt9eUESI?si=QjV1gNWl_atyQn2c", by: "@coach_mma" },
      { title: "CHECKING KICKS DRILL", youtubeUrl: "https://youtube.com/shorts/6jnXUgranJw?si=p1w8sB7fKRZuzjYx", by: "@coach_mma" },
      { title: "CHECKING A KICK LIVE", youtubeUrl: "https://youtube.com/shorts/cPZgFl-BriE?si=fT97-MBWDF9emc-U", by: "@coach_mma" },
      { title: "HOW TO CHECK A KICK", youtubeUrl: "https://youtube.com/shorts/jaT1lvomao0", by: "@coach_mma" },
      { title: "HOW TO PROPERLY CHECK A KICK", youtubeUrl: "https://youtube.com/shorts/n-XbTrhWLwg", by: "@coach_mma" },
      { title: "HOW TO CHECK A KICK TO THE LEG", youtubeUrl: "https://youtube.com/shorts/7wjFiBhwGsY", by: "@coach_mma" },
    ], "Guard & Blocking": [
      { title: "HEAD & BODY BLOCKING", youtubeUrl: "https://youtube.com/shorts/znyZtIaI47g?si=yZW4s5vWMXj-o3j3", by: "@coach_mma" },
      { title: "HOW TO BLOCK MIDDLE KICKS", youtubeUrl: "https://youtube.com/shorts/htKgRFLJcnA?si=oIoXc_21DUNA-wo_", by: "@coach_mma" },
      { title: "BLOCKING THE ROUND HOUSE KICK", youtubeUrl: "https://youtube.com/shorts/DRW8JatOBRs?si=R6zoG3eCLhZBp_FQ", by: "@coach_mma" },
      { title: "BLOCKING BODY KICKS", youtubeUrl: "https://youtube.com/shorts/znyZtIaI47g?si=kok46s3e7EYn6mhs", by: "@coach_mma" },
    ], "Footwork": [
      { title: "ADDING ANGLES FOOTWORK DRILL", youtubeUrl: "https://youtube.com/shorts/GWK_bKK5_ys?si=BIvbvRBqpClS5DbN", by: "@coach_mma" },
      { title: "3 BASIC FOOTWORK DRILLS!", youtubeUrl: "https://youtube.com/shorts/OpsYWyKpqhQ?si=4JlE99Qg22oeLV7Z", by: "@coach_mma" },
      { title: "HOW TO IMPROVE YOUR FOOTWORK", youtubeUrl: "https://youtube.com/shorts/7xxr6UikKA0?si=5zqgtlsKJVGx8qeL", by: "@coach_mma" },
    ] },
  },
  muaythai: {
    offense: { "Strikes & Combos": [
      { title: "THE CORRECT MUAY THAI JAB", youtubeUrl: "https://youtube.com/shorts/7vEeQpP4noY?si=1G11QNL8QeaG0UFz", by: "@coach_mma" },
      { title: "STRAIGHT OR CROSS", youtubeUrl: "https://youtube.com/shorts/kS2ND1qGTWY?si=jneutkQBGEONoIkf", by: "@coach_mma" },
      { title: "MUAY THAI LEG KICK FROM A PRO!", youtubeUrl: "https://youtube.com/shorts/B6nKzeBLsow?si=Mv-ZMr02Zr6JqoKt", by: "@coach_mma" },
      { title: "HOW TO GET EXPLOSIVE PUNCHES!", youtubeUrl: "https://youtube.com/shorts/j5JKBFkdAMc?si=jjB_jbeuH7AdgBzZ", by: "@coach_mma" },
      { title: "UPPERCUT FEINT", youtubeUrl: "https://youtu.be/0URSrW471o4?si=tyUmW7wH7-Wbs-xd", by: "@coach_mma" },
      { title: "ELBOW COMBOS", by: "@nkm_bkk" },
      { title: "HOW TO THROW A LEAD QUESTION MARK KICK WITH LUKE ROCKHOLD", youtubeUrl: "https://youtube.com/shorts/_VTESrnObqM?si=v8qLR5ijEyNSURYq", by: "@coach_mma" },
      { title: "COUNTERING BOXING WITH MUAY THAI STRIKES", youtubeUrl: "https://youtube.com/shorts/s-DOj6wXGXs?si=-CeGnkPQQ8GICwlv", by: "@coach_mma" },
    ], "Clinch & Elbows": [
      { title: "KICKBOXING KNEE", youtubeUrl: "https://youtube.com/shorts/Ms65vg_X0_s?si=9SyamDdy23ckzED1", by: "@coach_mma" },
      { title: "KICKBOXING VS MUAY THAI CLINCH", youtubeUrl: "https://youtube.com/shorts/nufhHhUSOgQ?si=qdpJrYp1iTSEOTej", by: "@coach_mma" },
      { title: "5 KNEES FROM CLINCH", youtubeUrl: "https://youtube.com/shorts/Xkv8Z5hp77w?si=dXiJhV0JlhrosoPW", by: "@coach_mma" },
      { title: "HOW TO MASTER THE MUAY THAI CLINCH", youtubeUrl: "https://youtube.com/watch?v=JfuAYvjLDT4", by: "@coach_mma" },
    ] },
    defense: { "Guard & Blocking": [
      { title: "BLOCKING KICKS", youtubeUrl: "https://youtube.com/shorts/htKgRFLJcnA?si=nO5hBrbHJWuN9gne", by: "@coach_mma" },
      { title: "MUAY THAI LONG GUARD", youtubeUrl: "https://youtube.com/shorts/uA-FjcN6WSs?si=2t1nByK5tP0tPQbQ", by: "@coach_mma" },
      { title: "COUNTERING BOXING WITH MUAY THAI STRIKES", youtubeUrl: "https://youtube.com/shorts/s-DOj6wXGXs?si=-CeGnkPQQ8GICwlv", by: "@coach_mma" },
    ], "Footwork": [
      { title: "MUAY THAI STANCES", youtubeUrl: "https://youtube.com/shorts/HBTi3vwJUUw?si=MBpHZ0SeG0hyRiBA", by: "@coach_mma" },
      { title: "BASIC FOOTWORK", youtubeUrl: "https://youtube.com/shorts/Q-5m5Fp9tdY?si=X8cV72mSJw03NxHU", by: "@coach_mma" },
      { title: "ADDING ANGLES FOOTWORK DRILL", youtubeUrl: "https://youtube.com/shorts/GWK_bKK5_ys?si=BIvbvRBqpClS5DbN", by: "@coach_mma" },
      { title: "3 BASIC FOOTWORK DRILLS!", youtubeUrl: "https://youtube.com/shorts/OpsYWyKpqhQ?si=4JlE99Qg22oeLV7Z", by: "@coach_mma" },
      { title: "HOW TO IMPROVE YOUR FOOTWORK", youtubeUrl: "https://youtube.com/shorts/7xxr6UikKA0?si=5zqgtlsKJVGx8qeL", by: "@coach_mma" },
    ], "Teep & Push Kicks": [
      { title: "TEEP PUSH KICK", by: "@coach_mma" },
      { title: "MASTER THE REAR TEEP KICK!", youtubeUrl: "https://youtube.com/shorts/YYkaBFQI47k?si=KUaeI1rduYHn2TGZ", by: "@coach_mma" },
      { title: "TEEP KICK BASIC TUTORIAL", youtubeUrl: "https://youtube.com/shorts/BxXjIiu6Y7k?si=Nbkw2NFGgckLHoD4", by: "@coach_mma" },
      { title: "MASTER THE FRONT TEEP KICK", youtubeUrl: "https://youtube.com/shorts/CJw8nUtaYdA?si=1uSs9YxiKhdqSJSB", by: "@coach_mma" },
      { title: "SECRET TO A GOOD SNAPPING FRONT KICK", youtubeUrl: "https://youtube.com/shorts/Mt9aiirJjl0?si=yb3aPa_9dSAeF0ps", by: "@coach_mma" },
      { title: "FRONT KICK TUTORIAL", youtubeUrl: "https://youtu.be/WV_OH8cuJFw?si=hu4OHmT7o-6eHQl3", by: "@coach_mma" },
      { title: "LEAD TEEP KICK", youtubeUrl: "https://youtube.com/shorts/GWATZ6IdDq0?si=zti4yIAaMcNCTlqK", by: "@coach_mma" },
    ] },
  },
  mma_stand: {
    offense: { "Striking Combos": [
      { title: "HOW TO GET EXPLOSIVE PUNCHES!", youtubeUrl: "https://youtube.com/shorts/j5JKBFkdAMc?si=jjB_jbeuH7AdgBzZ", by: "@coach_mma" },
      { title: "UPPERCUT FEINT", youtubeUrl: "https://youtu.be/0URSrW471o4?si=tyUmW7wH7-Wbs-xd", by: "@coach_mma" },
      { title: "HOW TO THROW A LEAD QUESTION MARK KICK WITH LUKE ROCKHOLD", youtubeUrl: "https://youtube.com/shorts/_VTESrnObqM?si=v8qLR5ijEyNSURYq", by: "@coach_mma" },
      { title: "STRIKING COMBINATIONS TO CONFUSE YOUR OPPONENT", youtubeUrl: "https://youtube.com/shorts/uFyk_hD4vmo", by: "@coach_mma" },
      { title: "MMA COMBOS EVERY FIGHTER SHOULD KNOW", youtubeUrl: "https://youtube.com/shorts/sool0wmXjmg", by: "@coach_mma" },
      { title: "BEST COMBOS FOR MMA", youtubeUrl: "https://youtube.com/shorts/pbhsXvlbIME", by: "@coach_mma" },
    ], "Clinch & Dirty Boxing": [
      { title: "KICKBOXING KNEE", youtubeUrl: "https://youtube.com/shorts/Ms65vg_X0_s?si=9SyamDdy23ckzED1", by: "@coach_mma" },
      { title: "KICKBOXING VS MUAY THAI CLINCH", youtubeUrl: "https://youtube.com/shorts/nufhHhUSOgQ?si=qdpJrYp1iTSEOTej", by: "@coach_mma" },
      { title: "5 KNEES FROM CLINCH", youtubeUrl: "https://youtube.com/shorts/Xkv8Z5hp77w?si=dXiJhV0JlhrosoPW", by: "@coach_mma" },
      { title: "CLINCH TO SINGLE TO DOUBLE LEG TAKEDOWN", youtubeUrl: "https://youtube.com/shorts/XwDKBv0ch1E?si=UfesSx9o4RwVAZCl", by: "@coach_mma" },
      { title: "3 MMA TAKEDOWNS YOU MUST KNOW!", youtubeUrl: "https://youtube.com/shorts/QbSajw6SkWk?si=pq0YzxRzhDXtuE73", by: "@coach_mma" },
      { title: "2 TAKEDOWNS USING THE CAGE!", youtubeUrl: "https://youtube.com/shorts/F1EWJcLBp5w?si=LiEKfhnBj9opLaKE", by: "@coach_mma" },
      { title: "3 TAKEDOWNS TO COUNTER BEING PRESSURED AGAINST FENCE", youtubeUrl: "https://youtube.com/shorts/wphIhZtnDf0?si=YXqdJgWrtnZaG884", by: "@coach_mma" },
    ] },
    defense: { "Striking Defence": [
      { title: "DEFENDING THE JAB STRAIGHT 1-2", youtubeUrl: "https://youtube.com/shorts/j9vreXOJcso?si=oZQV2EJSg6rAaYl9", by: "@coach_mma" },
      { title: "BOXING DEFENSE TUTORIAL", youtubeUrl: "https://youtu.be/4zBrGeMdnQI?si=iAhMVDriOzpsxCoC", by: "@coach_mma" },
      { title: "CHECKING KICKS FROM MMA STANCE", youtubeUrl: "https://youtube.com/shorts/Msxt-LzrOow?si=F0thYLcRRD8fFdwK", by: "@coach_mma" },
      { title: "STRIKING DEFENCE DRILL", youtubeUrl: "https://youtube.com/shorts/FFb-VXSIepM", by: "@coach_mma" },
      { title: "DEFEND & COUNTER THE JAB-CROSS", youtubeUrl: "https://youtube.com/shorts/0Fuu2ykV9FQ", by: "@coach_mma" },
      { title: "UNBEATABLE DEFENSE FOR MMA", youtubeUrl: "https://youtube.com/shorts/iAFWtrdldM0", by: "@coach_mma" },
    ], "Cage Control": [
      { title: "GETTING UP USING THE CAGE", youtubeUrl: "https://youtube.com/shorts/kTD6kgFWGpY?si=2YMni0nDeE7g85Cd", by: "@coach_mma" },
      { title: "HOW TO GET UP PROPERLY WHILE STUCK ON CAGE OR WALL!", youtubeUrl: "https://youtube.com/shorts/XUMu1rBf-GI?si=pT3TUCFIlu40Ho51", by: "@coach_mma" },
      { title: "3 MMA CAGE FUNDAMENTALS", youtubeUrl: "https://youtu.be/VilmLcsmozQ?si=XTAL_YPAYj5sRLpA", by: "@coach_mma" },
      { title: "CAGE CONTROL BASICS", youtubeUrl: "https://youtu.be/obT6vlJq_M8?si=sckyVPom-gIkhMSQ", by: "@coach_mma" },
      { title: "2 TAKEDOWNS USING THE CAGE!", youtubeUrl: "https://youtube.com/shorts/F1EWJcLBp5w?si=LiEKfhnBj9opLaKE", by: "@coach_mma" },
      { title: "3 TAKEDOWNS TO COUNTER BEING PRESSURED AGAINST FENCE", youtubeUrl: "https://youtube.com/shorts/wphIhZtnDf0?si=YXqdJgWrtnZaG884", by: "@coach_mma" },
    ], "Footwork": [
      { title: "ADDING ANGLES FOOTWORK DRILL", youtubeUrl: "https://youtube.com/shorts/GWK_bKK5_ys?si=BIvbvRBqpClS5DbN", by: "@coach_mma" },
      { title: "3 BASIC FOOTWORK DRILLS!", youtubeUrl: "https://youtube.com/shorts/OpsYWyKpqhQ?si=4JlE99Qg22oeLV7Z", by: "@coach_mma" },
      { title: "HOW TO IMPROVE YOUR FOOTWORK", youtubeUrl: "https://youtube.com/shorts/7xxr6UikKA0?si=5zqgtlsKJVGx8qeL", by: "@coach_mma" },
    ] },
  },
  bjj: {
    offense: { "Submissions": [
      { title: "THE BUGGY CHOKE", youtubeUrl: "https://youtube.com/shorts/9Ot2d0A_edU?si=aGj_KIpj8-KE5uNS", by: "@coach_mma" },
      { title: "PROPER REAR NAKED CHOKE", youtubeUrl: "https://youtube.com/shorts/8MpFS5wvSAM?si=VRJJh-pPF29wOy-6", by: "@coach_mma" },
      { title: "KIMURA", youtubeUrl: "https://youtube.com/shorts/fqQ4mVxJaoE?si=CZt9VIHj06vrHQKJ", by: "@coach_mma" },
      { title: "ARMBAR FROM GUARD", by: "@coach_mma" },
      { title: "TRIANGLE CHOKE", by: "@grappleking" },
      { title: "3 WAYS TO PASS GUARD", youtubeUrl: "https://youtube.com/shorts/xYyy333LFK0?si=UWuGbW6EKLUI1-gR", by: "@coach_mma" },
      { title: "CRAIG JONES KIMURA BREAKDOWN", youtubeUrl: "https://youtube.com/shorts/3z1uix85fOg?si=wDxgXF20eP5ryzs2", by: "@coach_mma" },
      { title: "THE DARCE VS ANACONDA CHOKE", youtubeUrl: "https://youtube.com/shorts/2F22f2jaA-A?si=8iQDtM4lRbhKX9zU", by: "@coach_mma" },
      { title: "THE SULOEV STRETCH", youtubeUrl: "https://youtube.com/shorts/W_07T_dLbk0?si=g6rqHsV6M1-lJzL6", by: "@coach_mma" },
      { title: "UNDERSTANDING THE SULOEV STRETCH", youtubeUrl: "https://youtube.com/shorts/6JBceusj2CQ?si=bv7VmOCbbOZ0yP2m", by: "@coach_mma" },
      { title: "OMOPLATA SUBMISSION - 5 EASY STEPS", youtubeUrl: "https://youtube.com/shorts/M2j8FmvqDqo", by: "@coach_mma" },
      { title: "3 KEYS TO OMOPLATA SUCCESS!", youtubeUrl: "https://youtube.com/shorts/wKzDcrkK0d0", by: "@coach_mma" },
      { title: "GUILLOTINE CHOKE", youtubeUrl: "https://youtube.com/shorts/V2HcNsJm4X8", by: "@coach_mma" },
      { title: "GUILLOTINE TO TRIANGLE", youtubeUrl: "https://youtube.com/shorts/PTBjnes9nQs", by: "@coach_mma" },
      { title: "ARM TRIANGLE SUBMISSION", youtubeUrl: "https://youtube.com/shorts/7326tSVPE6k", by: "@coach_mma" },
      { title: "EZEKIEL CHOKE", youtubeUrl: "https://youtube.com/shorts/AdUCINh5KWQ", by: "@coach_mma" },
      { title: "NO GI EZEKIEL CHOKE", youtubeUrl: "https://youtube.com/shorts/LerIJ8EA1aw", by: "@coach_mma" },
      { title: "NORTH SOUTH CHOKE BY MARCELO GARCIA", youtubeUrl: "https://youtube.com/shorts/aIj7zgqBSh4", by: "@coach_mma" },
      { title: "ARM LOCK TO TRIANGLE SEQUENCE", youtubeUrl: "https://youtube.com/shorts/gGk3zW3vhUk", by: "@coach_mma" },
      { title: "REAR NAKED CHOKE BY JOHN DANAHER", youtubeUrl: "https://youtube.com/shorts/oYDe-hrazL8", by: "@coach_mma" },
      { title: "DUSTIN POIRIER TEACHES JUMPING THE GULLY - GUILLOTINE!", youtubeUrl: "https://youtube.com/shorts/73hzgFzQLAo?si=aJRD5iyFJo84cwo2", by: "@coach_mma" },
      { title: "DARCE CHOKE", youtubeUrl: "https://youtube.com/shorts/xmX1Tjh3mjQ?si=InjXhGAXkya5rQNh", by: "@coach_mma" },
      { title: "ANACONDA CHOKE!", youtubeUrl: "https://youtube.com/shorts/Utw0NYDk0b0?si=X5sAi8BKmHQgeYJT", by: "@coach_mma" },
      { title: "TIGHTENING THE REAR NAKED CHOKE", youtubeUrl: "https://youtube.com/shorts/jxBUVsICn8k?si=THFeYgMt2D6xnvoj", by: "@coach_mma" },
    ], "Guard Play & Sweeps": [
      { title: "HOW TO FALL", youtubeUrl: "https://youtube.com/shorts/YvY3VwbxxDw?si=V2vjjk652qjUnNqc", by: "@coach_mma" },
      { title: "HOW TO SHRIMP", youtubeUrl: "https://youtube.com/shorts/H0Qc89d4LKU?si=eSEpWEQwNg_j4iHX", by: "@coach_mma" },
      { title: "THE COLLAR TIE", youtubeUrl: "https://youtube.com/shorts/AqCOhw0EQ50?si=WCb2jXqc0LtTwmJl", by: "@coach_mma" },
      { title: "COLLAR TIE ADVANCED FUNCTIONS", youtubeUrl: "https://youtu.be/MR1gQnRPZ_o?si=BenDRiBKOegsBjOl", by: "@coach_mma" },
      { title: "CLOSED GUARD CONTROL", by: "@grappleking" },
      { title: "THE DUCK UNDER", youtubeUrl: "https://youtube.com/shorts/Bl93BiKodYw?si=Wq-Wkiwz9jI-zzm6", by: "@coach_mma" },
    ], "Leg Locks": [
      { title: "STRAIGHT ANKLE LOCK!", youtubeUrl: "https://youtube.com/shorts/s3536M6YoK0?si=8pKqajg39LI-TOea", by: "@coach_mma" },
      { title: "CRAIG JONES STRAIGHT ANKLE LOCK", youtubeUrl: "https://youtube.com/shorts/2QFHmk3BlcQ?si=HRZsRwYAJUOOzUqp", by: "@coach_mma" },
      { title: "FOOT LOCK BY CRAIG JONES", youtubeUrl: "https://youtube.com/shorts/SBUQRndCb6o?si=_5KVa89x36JcrxD1", by: "@coach_mma" },
      { title: "PERFECT THE OUTSIDE HEEL HOOK!", youtubeUrl: "https://youtu.be/zQ-FNH5a01k?si=g2FWPwSmptDhUIGU", by: "@coach_mma" },
      { title: "HOW TO PERFECT INSIDE HEEL HOOK!!", youtubeUrl: "https://youtu.be/Twkyo0A09Q8?si=S5iC4jLlGXdWcyqU", by: "@coach_mma" },
    ] },
    defense: { "Guard": [
      { title: "PASSING GUARD BASIC", youtubeUrl: "https://youtube.com/shorts/QKzdJr5kfi8?si=YknrwQ-RpRMlu_gf", by: "@coach_mma" },
      { title: "NINJA CHOKE FROM CLOSED GUARD", youtubeUrl: "https://youtube.com/shorts/0W8Mz_VRU7M?si=k8IQUwPOgucdq5RO", by: "@coach_mma" },
      { title: "ESCAPING FROM THE BOTTOM & STAYING RELAXED", youtubeUrl: "https://youtu.be/w37vdjrdfno?si=5v7GbOV_BkCPKlWp", by: "@coach_mma" },
      { title: "3 WAYS TO ESCAPE MOUNT", youtubeUrl: "https://youtube.com/shorts/qT9n3upeRmk?si=nRe7gF58h6GcmNsN", by: "@coach_mma" },
      { title: "3 TURTLE ESCAPES", youtubeUrl: "https://youtube.com/shorts/1cA-ESYyJRo?si=mc_pXJ-KnyDdhYMo", by: "@coach_mma" },
    ], "Sweeps & Escaping Submissions": [
      { title: "ESCAPE CLOSED GUARD WITH JOHN DANAHER", youtubeUrl: "https://youtube.com/shorts/xYW7CCmA3ow?si=yECV1RjXaSrgUiDO", by: "@coach_mma" },
      { title: "3 CLOSED GUARD SWEEPS", youtubeUrl: "https://youtube.com/shorts/nJ3FLY0PbVs?si=b-wSxnQR-y3l31pR", by: "@coach_mma" },
      { title: "ESCAPING SIDE CONTROL", youtubeUrl: "https://youtube.com/shorts/nhGEJp3QIT8?si=KoLZMvFBw6OAj6k2", by: "@coach_mma" },
      { title: "GUILLOTINE ESCAPE ROLL", youtubeUrl: "https://youtube.com/shorts/9b07TRYSv3s?si=aHyDhVP0WppD7n4W", by: "@coach_mma" },
      { title: "ESCAPING THE ARMBAR BY CRAIG JONES", youtubeUrl: "https://youtube.com/shorts/uKf4a23GbjA?si=dk4wl5vYh0wVjFhV", by: "@coach_mma" },
      { title: "HOW TO STOP THE DARCE CHOKE", youtubeUrl: "https://youtube.com/shorts/gM5wRrUxatk?si=knLFMnPCdJqUYdZZ", by: "@coach_mma" },
      { title: "ESCAPING THE REAR NAKED CHOKE", youtubeUrl: "https://youtube.com/shorts/KfMlyrvLHk8?si=mRPJzVFjE6MUOkGh", by: "@coach_mma" },
      { title: "TWO WAYS TO ESCAPE SIDE CONTROL", youtubeUrl: "https://youtube.com/shorts/erxY_sTLh8g?si=tbJr5FEO7W9wJweu", by: "@coach_mma" },
      { title: "HOW TO ESCAPE FULL MOUNT", youtubeUrl: "https://youtu.be/wafcVZd4kiU?si=WxztL8czhgE4gTlI", by: "@coach_mma" },
    ], "Leg Locks": [
      { title: "HEEL HOOK 50/50 ESCAPE", youtubeUrl: "https://youtube.com/shorts/uxCWCwnF6EQ?si=8wx1jKMECZXcg6x8", by: "@coach_mma" },
      { title: "INSIDE HEEL HOOK DEFENSE", youtubeUrl: "https://youtube.com/shorts/WOSZVliZoow?si=eFi67F_kbIAY87pn", by: "@coach_mma" },
      { title: "LEG LOCKS TYPES RISKS AND SAFE TRAINING", youtubeUrl: "https://youtube.com/shorts/fRjKBpBTDVg", by: "@coach_mma" },
      { title: "BASIC FOOT LOCKS FOR BEGINNERS", youtubeUrl: "https://www.youtube.com/watch?v=Hlh2NRQ_EJQ", by: "@coach_mma" },
    ] },
  },
  wrestling: {
    offense: { "Takedowns": [
      { title: "SINGLE LEG TAKEDOWN", youtubeUrl: "https://youtube.com/shorts/dl_SvwPfpDc?si=hXFzdPidgko6OnVE", by: "@coach_mma" },
      { title: "DOUBLE LEG TAKEDOWN", youtubeUrl: "https://youtube.com/shorts/qDD40BckF20?si=zjIhg8kP_zy69VmU", by: "@coach_mma" },
      { title: "CLINCH TO SINGLE TO DOUBLE LEG TAKEDOWN", youtubeUrl: "https://youtube.com/shorts/XwDKBv0ch1E?si=UfesSx9o4RwVAZCl", by: "@coach_mma" },
      { title: "FIREMAN CARRY TAKEDOWN", youtubeUrl: "https://youtube.com/shorts/eKF2Q9AKG7U?si=aZS7_BiCPRTzY0fM", by: "@coach_mma" },
      { title: "DANIEL CORMIER EASIEST TAKEDOWN!", youtubeUrl: "https://youtube.com/shorts/XoQ1UOlQjig?si=ycnjzYJ5I8KWHU5I", by: "@coach_mma" },
      { title: "SINGLE LEG TAKEDOWN 2", youtubeUrl: "https://youtube.com/shorts/2u0ZKAbxp6w?si=RJnJwcnvk9vExedE", by: "@coach_mma" },
      { title: "DOUBLE LEG TAKEDOWN 2", youtubeUrl: "https://youtube.com/shorts/qDD40BckF20?si=X3Rwt14FZ2FD4NA5", by: "@coach_mma" },
      { title: "FIREMAN'S CARRY TAKEDOWN 2", youtubeUrl: "https://youtube.com/shorts/HDk0zbGr5z4?si=BS3NYWtqleOqLwi8", by: "@coach_mma" },
      { title: "TOP 5 WRESTLING TAKEDOWNS", youtubeUrl: "https://youtu.be/Bugf5PXVt-8?si=QNXCD4KkWWxCdDH2", by: "@coach_mma" },
      { title: "3 MMA TAKEDOWNS YOU MUST KNOW!", youtubeUrl: "https://youtube.com/shorts/QbSajw6SkWk?si=pq0YzxRzhDXtuE73", by: "@coach_mma" },
      { title: "2 TAKEDOWNS USING THE CAGE!", youtubeUrl: "https://youtube.com/shorts/F1EWJcLBp5w?si=LiEKfhnBj9opLaKE", by: "@coach_mma" },
      { title: "3 TAKEDOWNS TO COUNTER BEING PRESSURED AGAINST FENCE", youtubeUrl: "https://youtube.com/shorts/wphIhZtnDf0?si=YXqdJgWrtnZaG884", by: "@coach_mma" },
    ], "Control & Pinning": [
      { title: "CHEST PRESSURE", youtubeUrl: "https://youtube.com/shorts/DQxu6YzU8_M?si=hCpmpRsw5nqnPJho", by: "@coach_mma" },
      { title: "HAND FIGHTING", youtubeUrl: "https://youtube.com/shorts/Y2urYTUaVm8?si=6rez7Ohnd0AKh0ZG", by: "@coach_mma" },
      { title: "WRESTLING TAKEDOWN AND PINNING TECHNIQUE", youtubeUrl: "https://youtube.com/shorts/_5XZThMPyhM", by: "@coach_mma" },
      { title: "WRESTLING PINNING TECHNIQUE — CHEST PRESSURE & SHOULDER CONTROL", youtubeUrl: "https://youtube.com/shorts/UaBfpvfyBYQ", by: "@coach_mma" },
      { title: "CLEAN GRAPPLING TECHNIQUE FOR TOTAL CONTROL", youtubeUrl: "https://youtube.com/shorts/m6AWNC99xV4", by: "@coach_mma" },
    ] },
    defense: { "Takedown Defence": [
      { title: "SPRAWL DEFENCE", by: "@ironsprawl" },
      { title: "SPRAWL OPTIONS", youtubeUrl: "https://youtube.com/shorts/_9j0hdWoSVs?si=g8TaeVggBLRn9WvD", by: "@coach_mma" },
      { title: "SPRAWL CORRECTLY", youtubeUrl: "https://youtube.com/shorts/_9j0hdWoSVs?si=veU70atsS7soQzRy", by: "@coach_mma" },
      { title: "SPRAWLING HIGH CROTCH SHOT BY BEN ASKREN", youtubeUrl: "https://youtube.com/shorts/bibqTwj6uTc?si=hx1NM0Qa2IEMN_fB", by: "@coach_mma" },
    ], "Scrambles & Footwork": [
      { title: "HOW TO TAKE A WRESTLING SHOT", youtubeUrl: "https://youtube.com/shorts/BzwNXX2dh6g?si=Xx2xb6liToD6oxq0", by: "@coach_mma" },
      { title: "ADVANCED SCRAMBLING", youtubeUrl: "https://youtube.com/shorts/iAKuQ3vo3xg?si=8TsMEq3SnK7DJjFX", by: "@coach_mma" },
      { title: "HOW TO SCRAMBLE PROPERLY!", youtubeUrl: "https://youtube.com/shorts/gjfmOi_I5ck?si=clCsmAa5CT6Onr8O", by: "@coach_mma" },
      { title: "SCRAMBLE TECHNIQUE - HIDING ANKLES", youtubeUrl: "https://youtube.com/shorts/KJ1N86MMAKk?si=Rxsw2CkPa6vb7Wap", by: "@coach_mma" },
      { title: "THE BACKFLIP SCRAMBLE", youtubeUrl: "https://youtube.com/shorts/Ag4MEDWXvCo?si=Y9RvS-F2WQsB2oLB", by: "@coach_mma" },
    ] },
  },
  judo: {
    offense: { "Throws": [
      { title: "OSOTO GARI JUDO THROW", youtubeUrl: "https://youtube.com/shorts/NkIPsD9ohnk?si=oQl-eLWJtaOhGdCy", by: "@coach_mma" },
      { title: "O-GOSHI", youtubeUrl: "https://youtube.com/shorts/cjQRZRhTsdQ?si=I3yhJrOmgKaxdCNH", by: "@coach_mma" },
      { title: "DE ASHI HARAI", youtubeUrl: "https://youtube.com/shorts/aWKXbpNtRU4?si=mGbVmYdUBJB8o46B", by: "@coach_mma" },
      { title: "Ō-SOTO-GARI THROW", youtubeUrl: "https://youtube.com/shorts/NkIPsD9ohnk?si=v16zutZADDbFml78", by: "@coach_mma" },
      { title: "TAI OTOSHI THROW", youtubeUrl: "https://youtube.com/shorts/k_YEPd-2yvI?si=cczYW9UOV-mU843t", by: "@coach_mma" },
      { title: "UCHI MATA THROW", youtubeUrl: "https://youtube.com/shorts/JFonpUKoFYI?si=5XrY-F8XlkQG7u62", by: "@coach_mma" },
      { title: "UCHI MATA", youtubeUrl: "https://youtube.com/shorts/JFonpUKoFYI?si=2oi-ZrbtxgAsc4su", by: "@coach_mma" },
      { title: "UCHI MATA COUNTER", youtubeUrl: "https://youtube.com/shorts/2EYkHJZlBLo?si=eRlR0OgNREIv1OWO", by: "@coach_mma" },
      { title: "TRICK OPPONENT & CHANGE THROW!", youtubeUrl: "https://youtube.com/shorts/u4-qznLIz5s?si=BG2oneM6zPwZ9-_U", by: "@coach_mma" },
      { title: "BASIC JUDO ATTACKS", youtubeUrl: "https://youtube.com/shorts/DB83pQPA80E?si=LobzKafqOFgKUfkT", by: "@coach_mma" },
      { title: "SODE-TSURIKOMI-GOSHI, KO-UCHI-MAKIKOMI, & SOTO-MAKIKOMI!", youtubeUrl: "https://youtube.com/shorts/qyfGRvFGtFE?si=9hWtmN1kqUBkvgOi", by: "@coach_mma" },
      { title: "HIGH LEVEL MICRO JUDO!", youtubeUrl: "https://youtu.be/FPEoJcK5tMI?si=gLUEsX4XFObeT-Qo", by: "@coach_mma" },
      { title: "OSOTO GARI THROW", youtubeUrl: "https://youtube.com/shorts/q54cKF06kPY?si=V14KBZAuvZh2MM_P", by: "@coach_mma" },
    ], "Grip Fighting": [
      { title: "OSORO GARI GRIP", youtubeUrl: "https://youtube.com/shorts/X0d-TGDQEFI?si=BOeRyxRwtpnvBa4_", by: "@coach_mma" },
      { title: "MASTERING INSIDE CONTROL & GRIPS", youtubeUrl: "https://youtube.com/shorts/6Cg3a1c6Vc8?si=NWGFHySoB8MRnf_3", by: "@coach_mma" },
      { title: "BASIC JUDO GRIP FIGHTING!", youtubeUrl: "https://youtu.be/67RpDNWRPDU?si=VCCVNFSIEYbI-NFd", by: "@coach_mma" },
      { title: "THE COLLAR TIE", youtubeUrl: "https://youtube.com/shorts/AqCOhw0EQ50?si=WCb2jXqc0LtTwmJl", by: "@coach_mma" },
      { title: "COLLAR TIE ADVANCED FUNCTIONS", youtubeUrl: "https://youtu.be/MR1gQnRPZ_o?si=BenDRiBKOegsBjOl", by: "@coach_mma" },
      { title: "HAND FIGHTING", youtubeUrl: "https://youtube.com/shorts/Y2urYTUaVm8?si=6rez7Ohnd0AKh0ZG", by: "@coach_mma" },
    ] },
    defense: { "Counters": [
      { title: "UCHI MATA COUNTER", youtubeUrl: "https://youtube.com/shorts/2EYkHJZlBLo?si=paKOl69bxJT2GMPv", by: "@coach_mma" },
      { title: "STIFF ARM DEFENSE & COUNTER!", youtubeUrl: "https://youtube.com/shorts/M9WS0hr_3I8?si=diHPxbIzb3WruQBz", by: "@coach_mma" },
      { title: "LATE STAGE JUDO DEFENSE", youtubeUrl: "https://youtu.be/0FEaTSyPVkY?si=WLeFwfzAsLhTxrtG", by: "@coach_mma" },
      { title: "ESCAPE OVERHAND GRIP!", youtubeUrl: "https://youtube.com/shorts/zhS5wgbruQM?si=cezt5p3ICaBYNFGF", by: "@coach_mma" },
      { title: "BASIC JUDO GRIP FIGHTING!", youtubeUrl: "https://youtu.be/67RpDNWRPDU?si=VCCVNFSIEYbI-NFd", by: "@coach_mma" },
    ], "Break Falls & Posture": [
      { title: "HOW TO FALL PROPERLY", youtubeUrl: "https://youtube.com/shorts/CsmIPJeb5Zc?si=AhVz4lHhbo_d9QK6", by: "@coach_mma" },
      { title: "HOW TO FALL SAFELY", youtubeUrl: "https://youtube.com/shorts/3tuD5Q5gLEE?si=pWdHExRuMRRZuyKa", by: "@coach_mma" },
      { title: "UKEMI BREAK FALL", youtubeUrl: "https://youtube.com/shorts/83zSfvEh0Is?si=4J4-09Qq3BQ86Lww", by: "@coach_mma" },
      { title: "3 WAYS TO BREAK FALL", youtubeUrl: "https://youtube.com/shorts/25FL2hQpkog?si=5BuBOig3Atep1QE1", by: "@coach_mma" },
    ], "Grips": [
      { title: "HOW TO BREAK GRIPS", youtubeUrl: "https://youtube.com/shorts/fqYCy90fMaQ?si=qxNX5Zejbyj8I_YJ", by: "@coach_mma" },
      { title: "OSORO GARI GRIP", youtubeUrl: "https://youtube.com/shorts/X0d-TGDQEFI?si=BOeRyxRwtpnvBa4_", by: "@coach_mma" },
      { title: "MASTERING INSIDE CONTROL & GRIPS", youtubeUrl: "https://youtube.com/shorts/6Cg3a1c6Vc8?si=NWGFHySoB8MRnf_3", by: "@coach_mma" },
      { title: "BASIC JUDO GRIP FIGHTING!", youtubeUrl: "https://youtu.be/67RpDNWRPDU?si=VCCVNFSIEYbI-NFd", by: "@coach_mma" },
      { title: "THE COLLAR TIE", youtubeUrl: "https://youtube.com/shorts/AqCOhw0EQ50?si=WCb2jXqc0LtTwmJl", by: "@coach_mma" },
      { title: "COLLAR TIE ADVANCED FUNCTIONS", youtubeUrl: "https://youtu.be/MR1gQnRPZ_o?si=BenDRiBKOegsBjOl", by: "@coach_mma" },
      { title: "HAND FIGHTING", youtubeUrl: "https://youtube.com/shorts/Y2urYTUaVm8?si=6rez7Ohnd0AKh0ZG", by: "@coach_mma" },
    ] },
  },
  mma_ground: {
    offense: { "Ground & Pound": [
      { title: "GROUND & POUND FROM FULL GUARD WITH UFC FIGHTER JARED FLASH GORDON!", youtubeUrl: "https://youtube.com/shorts/2Bq406YSBc0?si=yplS394OqGsPR04f", by: "@coach_mma" },
      { title: "3 BASIC GROUND & POUND TACTICS!", youtubeUrl: "https://youtube.com/shorts/3cdZPf92VAM?si=K29rE7FQjdGa1shf", by: "@coach_mma" },
      { title: "GROUND & POUND - TRAPPING & ELBOWS", youtubeUrl: "https://youtube.com/shorts/BXoXUvPA5h0?si=SWYdhjHHeDLeBUa6", by: "@coach_mma" },
      { title: "GROUND & POUND TUTORIAL", youtubeUrl: "https://youtu.be/3jX4OOK2ry4?si=P-0w7Bz_7CMW4AcY", by: "@coach_mma" },
    ], "Submissions": [
      { title: "THE BUGGY CHOKE", youtubeUrl: "https://youtube.com/shorts/9Ot2d0A_edU?si=aGj_KIpj8-KE5uNS", by: "@coach_mma" },
      { title: "PROPER REAR NAKED CHOKE", youtubeUrl: "https://youtube.com/shorts/8MpFS5wvSAM?si=VRJJh-pPF29wOy-6", by: "@coach_mma" },
      { title: "KIMURA", youtubeUrl: "https://youtube.com/shorts/fqQ4mVxJaoE?si=CZt9VIHj06vrHQKJ", by: "@coach_mma" },
      { title: "ARMBAR FROM GUARD", by: "@coach_mma" },
      { title: "TRIANGLE CHOKE", by: "@grappleking" },
      { title: "3 WAYS TO PASS GUARD", youtubeUrl: "https://youtube.com/shorts/xYyy333LFK0?si=UWuGbW6EKLUI1-gR", by: "@coach_mma" },
      { title: "CRAIG JONES KIMURA BREAKDOWN", youtubeUrl: "https://youtube.com/shorts/3z1uix85fOg?si=wDxgXF20eP5ryzs2", by: "@coach_mma" },
      { title: "THE DARCE VS ANACONDA CHOKE", youtubeUrl: "https://youtube.com/shorts/2F22f2jaA-A?si=8iQDtM4lRbhKX9zU", by: "@coach_mma" },
      { title: "THE SULOEV STRETCH", youtubeUrl: "https://youtube.com/shorts/W_07T_dLbk0?si=g6rqHsV6M1-lJzL6", by: "@coach_mma" },
      { title: "UNDERSTANDING THE SULOEV STRETCH", youtubeUrl: "https://youtube.com/shorts/6JBceusj2CQ?si=bv7VmOCbbOZ0yP2m", by: "@coach_mma" },
      { title: "DUSTIN POIRIER TEACHES JUMPING THE GULLY - GUILLOTINE!", youtubeUrl: "https://youtube.com/shorts/73hzgFzQLAo?si=aJRD5iyFJo84cwo2", by: "@coach_mma" },
    ] },
    defense: { "Ground Defence": [
      { title: "DEFENDING JUDO'S ARMBAR BY OLYMPIC WRESTLERS", youtubeUrl: "https://youtu.be/KGdthuh8ItY?si=TFRsgjaoCSAupH4e", by: "@coach_mma" },
      { title: "DEFENDING GROUND & POUND", youtubeUrl: "https://youtube.com/shorts/Cb1j1nBxPNQ?si=acchkEOxnVEDsa7I", by: "@coach_mma" },
      { title: "3 WAYS TO BREAK FALL", youtubeUrl: "https://youtube.com/shorts/25FL2hQpkog?si=5BuBOig3Atep1QE1", by: "@coach_mma" },
    ], "Getting Up": [
      { title: "HOW TO GET UP FROM CLOSED GUARD", youtubeUrl: "https://youtube.com/shorts/GQwQdRL8vX4?si=zVxJxvMi6GRkz4My", by: "@coach_mma" },
      { title: "ESCAPING FULL MOUNT WHILE BEING PUNCHED!", youtubeUrl: "https://youtube.com/shorts/QSuiPYkOaBs?si=J5bADVZMdEOE1hUA", by: "@coach_mma" },
      { title: "3 TURTLE ESCAPES", youtubeUrl: "https://youtube.com/shorts/1cA-ESYyJRo?si=mc_pXJ-KnyDdhYMo", by: "@coach_mma" },
      { title: "EASIEST ESCAPE FROM BOTTOM POSITION", youtubeUrl: "https://youtube.com/shorts/RDO2tnCj_sU", by: "@coach_mma" },
      { title: "MMA GROUND ESCAPE FOR BEGINNERS", youtubeUrl: "https://youtube.com/shorts/jsFQKA_iBaw", by: "@coach_mma" },
      { title: "ESCAPE FROM MOUNT WITH HEAVY TOP PRESSURE", youtubeUrl: "https://youtube.com/shorts/L3KpF8c-UDs", by: "@coach_mma" },
    ] },
  },
  grappling_arts: {
    offense: { "Videos": [
      { title: "JUDO & WRESTLING WITH 2 BJJ BLACK BELTS!", youtubeUrl: "https://youtu.be/4egQ8mmuoAY?si=KJ4_JZYiAaUPEv2S", by: "@coach_mma" },
      { title: "MMA VS BJJ GRAPPLING", youtubeUrl: "https://youtube.com/shorts/YE-x12mROeY?si=FOFWT7ULuQyUDJkmn", by: "@coach_mma" },
      { title: "BEST BJJ MMA POSITIONS!", youtubeUrl: "https://youtu.be/PrfDtuAn-3k?si=b1M8qHejFllj432f", by: "@coach_mma" },
      { title: "ESCAPING FROM THE BOTTOM & STAYING RELAXED", youtubeUrl: "https://youtu.be/w37vdjrdfno?si=5v7GbOV_BkCPKlWp", by: "@coach_mma" },
      { title: "TAKEDOWNS & GUILLOTINES", youtubeUrl: "https://youtube.com/shorts/cNm8rjLKZdQ?si=lx57daCicbMJ3hdN", by: "@coach_mma" },
      { title: "THE DARCE VS ANACONDA CHOKE", youtubeUrl: "https://youtube.com/shorts/2F22f2jaA-A?si=8iQDtM4lRbhKX9zU", by: "@coach_mma" },
      { title: "PERFECT THE OUTSIDE HEEL HOOK!", youtubeUrl: "https://youtu.be/zQ-FNH5a01k?si=g2FWPwSmptDhUIGU", by: "@coach_mma" },
      { title: "HOW TO PERFECT INSIDE HEEL HOOK!!", youtubeUrl: "https://youtu.be/Twkyo0A09Q8?si=S5iC4jLlGXdWcyqU", by: "@coach_mma" },
      { title: "TOP 5 WRESTLING TAKEDOWNS", youtubeUrl: "https://youtu.be/Bugf5PXVt-8?si=QNXCD4KkWWxCdDH2", by: "@coach_mma" },
      { title: "3 MMA TAKEDOWNS YOU MUST KNOW!", youtubeUrl: "https://youtube.com/shorts/QbSajw6SkWk?si=pq0YzxRzhDXtuE73", by: "@coach_mma" },
      { title: "SCRAMBLE TECHNIQUE - HIDING ANKLES", youtubeUrl: "https://youtube.com/shorts/KJ1N86MMAKk?si=Rxsw2CkPa6vb7Wap", by: "@coach_mma" },
      { title: "THE BACKFLIP SCRAMBLE", youtubeUrl: "https://youtube.com/shorts/Ag4MEDWXvCo?si=Y9RvS-F2WQsB2oLB", by: "@coach_mma" },
      { title: "THE DUCK UNDER", youtubeUrl: "https://youtube.com/shorts/Bl93BiKodYw?si=Wq-Wkiwz9jI-zzm6", by: "@coach_mma" },
    ] },
    defense: {},
  },
  striking_arts: {
    offense: { "Videos": [
      { title: "CORRECT JAB FROM COREY SANDHAGEN", youtubeUrl: "https://youtube.com/shorts/php2qxReE3Q?si=2UEhXAwLewcWMcZi", by: "@coach_mma" },
      { title: "LOW KICKS TUTORIAL", youtubeUrl: "https://youtube.com/shorts/kHW09J700XQ?si=gWZUad5x11zFCB5E", by: "@coach_mma" },
      { title: "KARATE IN MMA!", youtubeUrl: "https://youtube.com/shorts/iDn0kca1Mco?si=cmU5jSiG25hrnVH4", by: "@coach_mma" },
      { title: "UPPERCUT FEINT", youtubeUrl: "https://youtu.be/0URSrW471o4?si=tyUmW7wH7-Wbs-xd", by: "@coach_mma" },
      { title: "2 BASIC BOXING FOOTWORK STEPS FROM SOUTHPAW", youtubeUrl: "https://youtube.com/shorts/2hJA0Xvnq3c?si=bmj8JVOnga_zz34Z", by: "@coach_mma" },
      { title: "HOW TO THROW A LEAD QUESTION MARK KICK WITH LUKE ROCKHOLD", youtubeUrl: "https://youtube.com/shorts/_VTESrnObqM?si=v8qLR5ijEyNSURYq", by: "@coach_mma" },
      { title: "MMA STRIKING - COUNTER THE COUNTER", youtubeUrl: "https://youtube.com/shorts/Pox822RhboI", by: "@coach_mma" },
      { title: "STRIKING VS GRAPPLING IN MMA", youtubeUrl: "https://youtube.com/shorts/hzVeXBNU6T8", by: "@coach_mma" },
      { title: "MMA STRIKING DRILL - SWITCH HITTING", youtubeUrl: "https://youtube.com/shorts/Ru05xfRG7xw", by: "@coach_mma" },
    ] },
    defense: {},
  },
  all_arts: {
    offense: { "Videos": [
      { title: "WRESTLING & BOXING!", youtubeUrl: "https://youtube.com/shorts/Nxk9pJKsZ1o?si=DlhGibeQKkytoUaw", by: "@coach_mma" },
      { title: "MMA BASIC TO ADVANCED!", youtubeUrl: "https://youtube.com/shorts/UeIKW0wFxI0?si=VOIXErxkK9h6hQrG", by: "@coach_mma" },
      { title: "MMA SPARRING DRILLS", youtubeUrl: "https://youtube.com/shorts/tb44zDi0rHM?si=DyDzjcdjzht92zpN", by: "@coach_mma" },
      { title: "THE BEST DEFENSE IN MMA!", youtubeUrl: "https://youtube.com/shorts/lVA7js8blLY?si=g_TLMfz2lVSBjva-", by: "@coach_mma" },
      { title: "HOW TO THROW A LEAD QUESTION MARK KICK WITH LUKE ROCKHOLD", youtubeUrl: "https://youtube.com/shorts/_VTESrnObqM?si=v8qLR5ijEyNSURYq", by: "@coach_mma" },
      { title: "STRIKING CLINCHING AND GRAPPLING", youtubeUrl: "https://youtube.com/shorts/OPnES2SJg_I", by: "@coach_mma" },
      { title: "3 MUST KNOW GRAPPLING TECHNIQUES FOR BEGINNERS", youtubeUrl: "https://youtube.com/shorts/QmaGRziBo34", by: "@coach_mma" },
      { title: "THESE GRAPPLING TECHNIQUES DECIDE WHO WINS", youtubeUrl: "https://youtube.com/shorts/pHhNt9Vkc68", by: "@coach_mma" },
      { title: "MMA GRAPPLING STRATEGY", youtubeUrl: "https://youtube.com/shorts/8ixe_3IknPs", by: "@coach_mma" },
      { title: "GRAPPLING TECHNIQUES THAT SHUT EVERYTHING DOWN", youtubeUrl: "https://youtube.com/shorts/7NiskLt-EmE", by: "@coach_mma" },
    ] },
    defense: {},
  },
  ufc_fighters: {
    offense: {
      "Justin Gaethje": [
        { title: "COUNTERING THE JAB BY JUSTIN GAETHJE", youtubeUrl: "https://youtube.com/shorts/MfGdSoofHpI?si=Olj8SFZvbrjIipdw", by: "@coach_mma" },
        { title: "REAR UPPERCUT BY JUSTIN GAETHJE", youtubeUrl: "https://youtube.com/shorts/MfGdSoofHpI?si=xiG6LaJgsm3MyHZV", by: "@coach_mma" },
        { title: "18 SIMPLE DRILLS BY JUSTIN GAETHJE", youtubeUrl: "https://youtu.be/3gpBLcxVtHg?si=fkINHnlHcHxjAyBl", by: "@coach_mma" },
        { title: "BOXING THROUGH THE CLINCH BY JUSTIN GAETHJE", youtubeUrl: "https://youtube.com/shorts/DEYC3uGxqcA?si=ISfvlzsS3PxCexV_", by: "@coach_mma" },
        { title: "HOW TO STAB THE BODY BY JUSTIN GAETHJE", youtubeUrl: "https://youtube.com/shorts/I3m6DelwYnQ?si=10es2I_ADKxV2ElM", by: "@coach_mma" },
        { title: "LEG POWER", youtubeUrl: "https://youtu.be/RuvAnQHCcKg?si=K6nVpkomLA6QWdEw", by: "@coach_mma" },
        { title: "PENETRATING THROUGH THE POCKET", youtubeUrl: "https://youtube.com/shorts/5qQtY5vbkWM?si=VmMvAV8v23lUHF3i", by: "@coach_mma" },
      ],
      "Dustin Poirier": [
        { title: "DUSTIN POIRIER TEACHES JUMPING THE GULLY - GUILLOTINE!", youtubeUrl: "https://youtube.com/shorts/73hzgFzQLAo?si=aJRD5iyFJo84cwo2", by: "@coach_mma" },
      ],
      "Luke Rockhold": [
        { title: "HOW TO THROW A LEAD QUESTION MARK KICK WITH LUKE ROCKHOLD", youtubeUrl: "https://youtube.com/shorts/_VTESrnObqM?si=v8qLR5ijEyNSURYq", by: "@coach_mma" },
      ],
      "Daniel Cormier": [
        { title: "DANIEL CORMIER EASIEST TAKEDOWN!", youtubeUrl: "https://youtube.com/shorts/XoQ1UOlQjig?si=ycnjzYJ5I8KWHU5I", by: "@coach_mma" },
      ],
      "Corey Sandhagen": [
        { title: "CORRECT JAB FROM COREY SANDHAGEN", youtubeUrl: "https://youtube.com/shorts/php2qxReE3Q?si=2UEhXAwLewcWMcZi", by: "@coach_mma" },
      ],
      "Georges St-Pierre": [
        { title: "GSP'S TAKEDOWN", youtubeUrl: "https://youtube.com/shorts/JIQV4KpBz_Q?si=ZrisibL4QjOLi_f7", by: "@coach_mma" },
      ],
    },
    defense: {},
  },
  bjj_fighters: {
    offense: {
      "Craig Jones": [
        { title: "CRAIG JONES KIMURA BREAKDOWN", youtubeUrl: "https://youtube.com/shorts/3z1uix85fOg?si=wDxgXF20eP5ryzs2", by: "@coach_mma" },
        { title: "CRAIG JONES STRAIGHT ANKLE LOCK", youtubeUrl: "https://youtube.com/shorts/2QFHmk3BlcQ?si=HRZsRwYAJUOOzUqp", by: "@coach_mma" },
        { title: "FOOT LOCK BY CRAIG JONES", youtubeUrl: "https://youtube.com/shorts/SBUQRndCb6o?si=_5KVa89x36JcrxD1", by: "@coach_mma" },
        { title: "ESCAPING THE ARMBAR BY CRAIG JONES", youtubeUrl: "https://youtube.com/shorts/uKf4a23GbjA?si=dk4wl5vYh0wVjFhV", by: "@coach_mma" },
      ],
      "John Danaher": [
        { title: "REAR NAKED CHOKE BY JOHN DANAHER", youtubeUrl: "https://youtube.com/shorts/oYDe-hrazL8", by: "@coach_mma" },
        { title: "ESCAPE CLOSED GUARD WITH JOHN DANAHER", youtubeUrl: "https://youtube.com/shorts/xYW7CCmA3ow?si=yECV1RjXaSrgUiDO", by: "@coach_mma" },
      ],
    },
    defense: {},
  },
  boxing_fighters: {
    offense: {
      "Terrance Crawford": [
        { title: "BLOCKING THE BODY WITH TERRANCE CRAWFORD", youtubeUrl: "https://youtube.com/shorts/8sqGeMGZdA4?si=FvUTFO6jOpJjJpMJ", by: "@coach_mma" },
      ],
    },
    defense: {},
  },
  mma_drills: {
    offense: { "Videos": [
      { title: "USING A ROPE TO SLIP & ROLL!", youtubeUrl: "https://youtube.com/shorts/iyqNaPtL-nY?si=BlhvwunoaKurQoca", by: "@coach_mma" },
      { title: "10 LIVE SPARRING DRILLS TO IMPROVE", youtubeUrl: "https://youtu.be/Gvb_w6xd3Yg?si=MNYPlgTjanWvhPdV", by: "@coach_mma" },
      { title: "3 MMA TAKEDOWNS YOU MUST KNOW!", youtubeUrl: "https://youtube.com/shorts/QbSajw6SkWk?si=pq0YzxRzhDXtuE73", by: "@coach_mma" },
      { title: "MMA SPARRING - HOW TO PERFORM & PERFECT", youtubeUrl: "https://youtube.com/shorts/gNh3FceMeHo", by: "@coach_mma" },
      { title: "MMA STRIKING DRILLS - ELITE STANCE CHANGING", youtubeUrl: "https://youtube.com/shorts/EesOsa2xmgM", by: "@coach_mma" },
      { title: "MMA SPARRING DRILLS - WORKING THE BLITZ", youtubeUrl: "https://youtube.com/shorts/vnszh-ApY5s", by: "@coach_mma" },
    ] },
    defense: {},
  },
  striking_drills: {
    offense: { "Boxing Drills": [
      { title: "SLIPPING PUNCHES", youtubeUrl: "https://youtube.com/shorts/pw5spzoLTHQ?si=d7uxTEVwtVeHRonT", by: "@coach_mma" },
      { title: "SLIPPING & ROLLING PUNCHES", youtubeUrl: "https://youtube.com/shorts/QicjOsJlVzQ?si=5sA-LUM2q0SpCW30", by: "@coach_mma" },
      { title: "USING A ROPE TO SLIP & ROLL!", youtubeUrl: "https://youtube.com/shorts/iyqNaPtL-nY?si=BlhvwunoaKurQoca", by: "@coach_mma" },
      { title: "HEAD MOVEMENT SLIPPING, DUCKING, & PULLING!", youtubeUrl: "https://youtube.com/shorts/SJ-rwj4DCVM?si=ESLepwe9-wa98dyj", by: "@coach_mma" },
      { title: "BUILDING PUNCHING ENDURANCE KILLER DIFFICULT DRILL!", youtubeUrl: "https://youtu.be/j4-r8llpYJo?si=pOdLd-KcJlOxpGSN", by: "@coach_mma" },
      { title: "COUNTERING BOXING DRILL - ADVANCED", youtubeUrl: "https://youtube.com/shorts/s-DOj6wXGXs?si=-CeGnkPQQ8GICwlv", by: "@coach_mma" },
      { title: "ADDING ANGLES FOOTWORK DRILL", youtubeUrl: "https://youtube.com/shorts/GWK_bKK5_ys?si=BIvbvRBqpClS5DbN", by: "@coach_mma" },
      { title: "BASIC BOXING FOOTWORK DRILL", youtubeUrl: "https://youtube.com/shorts/TJEgxaWWOuo?si=PV8THNjQ55gGhDN-", by: "@coach_mma" },
      { title: "HOW TO IMPROVE YOUR FOOTWORK", youtubeUrl: "https://youtube.com/shorts/7xxr6UikKA0?si=5zqgtlsKJVGx8qeL", by: "@coach_mma" },
      { title: "FOOTWORK DRILLS TO INSTANTLY IMPROVE BOXING!", youtubeUrl: "https://youtu.be/rnwEUIylf8A?si=kwCMIQ9lIY4nQc1Z", by: "@coach_mma" },
      { title: "2 BASIC BOXING FOOTWORK STEPS FROM SOUTHPAW", youtubeUrl: "https://youtube.com/shorts/2hJA0Xvnq3c?si=bmj8JVOnga_zz34Z", by: "@coach_mma" },
    ], "Kickboxing Drills": [
      { title: "BUILDING PUNCHING ENDURANCE KILLER DIFFICULT DRILL!", youtubeUrl: "https://youtu.be/j4-r8llpYJo?si=pOdLd-KcJlOxpGSN", by: "@coach_mma" },
      { title: "10 LIVE SPARRING DRILLS TO IMPROVE", youtubeUrl: "https://youtu.be/Gvb_w6xd3Yg?si=MNYPlgTjanWvhPdV", by: "@coach_mma" },
      { title: "COUNTERING BOXING DRILL - ADVANCED", youtubeUrl: "https://youtube.com/shorts/s-DOj6wXGXs?si=-CeGnkPQQ8GICwlv", by: "@coach_mma" },
      { title: "ADDING ANGLES FOOTWORK DRILL", youtubeUrl: "https://youtube.com/shorts/GWK_bKK5_ys?si=BIvbvRBqpClS5DbN", by: "@coach_mma" },
      { title: "HOW TO IMPROVE YOUR FOOTWORK", youtubeUrl: "https://youtube.com/shorts/7xxr6UikKA0?si=5zqgtlsKJVGx8qeL", by: "@coach_mma" },
      { title: "K-1 KICKBOXING DRILLS - PROGRESSIVE COMBOS", youtubeUrl: "https://youtube.com/shorts/1MD-wJBLNhg", by: "@coach_mma" },
      { title: "DUTCH KICKBOXING HIGH VOLUME DRILLS", youtubeUrl: "https://youtube.com/shorts/kCsVbi66U1g", by: "@coach_mma" },
      { title: "FUN KICKBOXING SPEED DRILLS", youtubeUrl: "https://youtube.com/shorts/QuxgDXMQ8lg", by: "@coach_mma" },
      { title: "MASTER GETTING INSIDE - DRILL FOR ALL FIGHTERS", youtubeUrl: "https://youtube.com/shorts/aRVdpkeipb4", by: "@coach_mma" },
    ], "Muay Thai Drills": [
      { title: "CHECK / BLOCK KICK AND RETURN!!", youtubeUrl: "https://youtube.com/shorts/DQp1Dg9LHac?si=R3sFY3tlx6x3CUGU", by: "@coach_mma" },
      { title: "BLOCKING & ATTACKING DRILL!", youtubeUrl: "https://youtube.com/shorts/1mfA61BLUxc?si=_PgCdEyfAKEG3aTC", by: "@coach_mma" },
      { title: "IMPROVING KICK DEXTERITY", youtubeUrl: "https://youtube.com/shorts/-PnqL2fkdzc?si=hktU4tcFiJRQFOP5", by: "@coach_mma" },
      { title: "BASIC MUAY THAI DRILL - KICK, BLOCK, COUNTER!", youtubeUrl: "https://youtube.com/shorts/zOsfZds3tSw?si=uAnj9QR9FTSspei4", by: "@coach_mma" },
      { title: "MUAY THAI PRACTICE WITH PATNER!", youtubeUrl: "https://youtu.be/TCF31GEwKy4?si=M-C8aYxOKvuPg_li", by: "@coach_mma" },
      { title: "BUILDING PUNCHING ENDURANCE KILLER DIFFICULT DRILL!", youtubeUrl: "https://youtu.be/j4-r8llpYJo?si=pOdLd-KcJlOxpGSN", by: "@coach_mma" },
      { title: "10 LIVE SPARRING DRILLS TO IMPROVE", youtubeUrl: "https://youtu.be/Gvb_w6xd3Yg?si=MNYPlgTjanWvhPdV", by: "@coach_mma" },
      { title: "COUNTERING BOXING DRILL - ADVANCED", youtubeUrl: "https://youtube.com/shorts/s-DOj6wXGXs?si=-CeGnkPQQ8GICwlv", by: "@coach_mma" },
      { title: "ADDING ANGLES FOOTWORK DRILL", youtubeUrl: "https://youtube.com/shorts/GWK_bKK5_ys?si=BIvbvRBqpClS5DbN", by: "@coach_mma" },
      { title: "HOW TO IMPROVE YOUR FOOTWORK", youtubeUrl: "https://youtube.com/shorts/7xxr6UikKA0?si=5zqgtlsKJVGx8qeL", by: "@coach_mma" },
    ] },
    defense: {},
  },
  grappling_drills: {
    offense: { "Videos": [
      { title: "HOW TO ESCAPE FULL MOUNT", youtubeUrl: "https://youtu.be/wafcVZd4kiU?si=WxztL8czhgE4gTlI", by: "@coach_mma" },
      { title: "GRAPPLING MASTERY - WRESTLING BJJ & MMA", youtubeUrl: "https://youtube.com/shorts/UwO4ChuSxOM", by: "@coach_mma" },
      { title: "CLEAN GRAPPLING TECHNIQUE FOR TOTAL CONTROL", youtubeUrl: "https://youtube.com/shorts/m6AWNC99xV4", by: "@coach_mma" },
      { title: "ESSENTIAL GRAPPLING TECHNIQUE EVERY FIGHTER SHOULD KNOW", youtubeUrl: "https://youtube.com/shorts/zdh2BNWhEZI", by: "@coach_mma" },
      { title: "WRESTLING FOR BJJ - THROW BY", youtubeUrl: "https://youtube.com/shorts/Qf2AUBbnAPY", by: "@coach_mma" },
      { title: "HOW TO SPRAWL", youtubeUrl: "https://youtube.com/shorts/mtIbNf_XzHs", by: "@coach_mma" },
    ] },
    defense: {},
  },
};

// ── BOUNTY DATA ───────────────────────────────────────────────
const BOUNTY_REQUESTS_INIT = [
  { id: 1, move: "Gogoplata from Closed Guard", discipline: "bjj", side: "offense", section: "Submissions", requestedBy: "@silk_fighter", status: "open", date: "2d ago" },
  { id: 2, move: "Spinning Back Elbow Counter",  discipline: "muaythai", side: "offense", section: "Strikes & Combos", requestedBy: "@bkk_warrior", status: "open", date: "5d ago" },
  { id: 3, move: "Calf Kick Defence & Counter",  discipline: "kickboxing", side: "defense", section: "Checking Kicks", requestedBy: "@lowkick_law", status: "open", date: "3d ago" },
  { id: 4, move: "Uchi Mata Into Armbar",         discipline: "judo", side: "offense", section: "Throws", requestedBy: "@ippon_irl", status: "fulfilled", date: "2w ago" },
];

// ── TOP UPLOADERS ──────────────────────────────────────────────
const TOP_UPLOADERS = [
  { rank: 1, name: "Coach MMA",   username: "@coach_mma",   uploads: 47, earned: 284, avatar: "C", badge: "🥇", streak: 12 },
  { rank: 2, name: "Grapple King",username: "@grappleking", uploads: 34, earned: 196, avatar: "G", badge: "🥈", streak: 8  },
  { rank: 3, name: "StrikeForce", username: "@strikeforce", uploads: 29, earned: 152, avatar: "S", badge: "🥉", streak: 6  },
  { rank: 4, name: "Mat Warrior", username: "@matwarrior",  uploads: 21, earned: 88,  avatar: "M", badge: "4️⃣", streak: 3  },
  { rank: 5, name: "Bkk Nak Muay",username: "@nkm_bkk",    uploads: 18, earned: 74,  avatar: "B", badge: "5️⃣", streak: 5  },
];

// ── UFC FIGHT CARDS ────────────────────────────────────────────
const UFC_CARDS = [
  {
    id: "ufc329",
    event: "UFC 329",
    subtitle: "McGREGOR VS HOLLOWAY 2",
    date: "SAT JULY 11, 2026",
    venue: "T-Mobile Arena",
    location: "Las Vegas, Nevada",
    broadcast: "Paramount+ · Main Card 9PM ET · Prelims 7PM ET",
    status: "upcoming",
    draftkings: "https://www.draftkings.com/sportsbook/mma",
    fights: [
      { id: 1, type: "🏆 MAIN EVENT — WELTERWEIGHT", f1: { name: "Conor McGregor", record: "22-6", country: "🇮🇪", odds: "+330" }, f2: { name: "Max Holloway", record: "27-9", country: "🇺🇸", odds: "-400" }, weight: "170 lbs", card: "main", methods: ["KO/TKO", "Submission", "Decision", "DQ"] },
      { id: 2, type: "CO-MAIN — LIGHTWEIGHT", f1: { name: "Paddy Pimblett", record: "23-4", country: "🇬🇧", odds: "+130" }, f2: { name: "Benoit Saint Denis", record: "17-3", country: "🇫🇷", odds: "-155" }, weight: "155 lbs", card: "main", methods: ["KO/TKO", "Submission", "Decision", "DQ"] },
      { id: 3, type: "BANTAMWEIGHT", f1: { name: "Cory Sandhagen", record: "18-5", country: "🇺🇸", odds: "-130" }, f2: { name: "Mario Bautista", record: "15-2", country: "🇺🇸", odds: "+110" }, weight: "135 lbs", card: "main", methods: ["KO/TKO", "Submission", "Decision", "DQ"] },
      { id: 4, type: "FLYWEIGHT", f1: { name: "Brandon Royval", record: "17-7", country: "🇺🇸", odds: "-280" }, f2: { name: "Lone'er Kavanagh", record: "11-1", country: "🇬🇧", odds: "+225" }, weight: "125 lbs", card: "main", methods: ["KO/TKO", "Submission", "Decision", "DQ"] },
      { id: 5, type: "LIGHTWEIGHT", f1: { name: "King Green", record: "35-15", country: "🇺🇸", odds: "+165" }, f2: { name: "Terrance McKinney", record: "16-7", country: "🇺🇸", odds: "-200" }, weight: "155 lbs", card: "main", methods: ["KO/TKO", "Submission", "Decision", "DQ"] },
      { id: 6, type: "LIGHT HEAVYWEIGHT", f1: { name: "Nikita Krylov", record: "31-9", country: "🇺🇦", odds: "+150" }, f2: { name: "Robert Whittaker", record: "26-8", country: "🇦🇺", odds: "-180" }, weight: "205 lbs", card: "prelim", methods: ["KO/TKO", "Submission", "Decision", "DQ"] },
      { id: 7, type: "HEAVYWEIGHT", f1: { name: "Gable Steveson", record: "3-0", country: "🇺🇸", odds: "-250" }, f2: { name: "Elisha Ellison", record: "11-3", country: "🇺🇸", odds: "+200" }, weight: "265 lbs", card: "prelim", methods: ["KO/TKO", "Submission", "Decision", "DQ"] },
      { id: 8, type: "BANTAMWEIGHT", f1: { name: "Cody Garbrandt", record: "13-6", country: "🇺🇸", odds: "+140" }, f2: { name: "Adrian Yanez", record: "18-5", country: "🇺🇸", odds: "-165" }, weight: "135 lbs", card: "prelim", methods: ["KO/TKO", "Submission", "Decision", "DQ"] },
      { id: 9, type: "MIDDLEWEIGHT", f1: { name: "Cesar Almeida", record: "10-1", country: "🇧🇷", odds: "-145" }, f2: { name: "Damian Pinas", record: "9-2", country: "🇳🇱", odds: "+120" }, weight: "185 lbs", card: "prelim", methods: ["KO/TKO", "Submission", "Decision", "DQ"] },
      { id: 10, type: "WOMEN'S FLYWEIGHT", f1: { name: "Wang Cong", record: "16-7", country: "🇨🇳", odds: "+175" }, f2: { name: "Tracy Cortez", record: "12-2", country: "🇺🇸", odds: "-215" }, weight: "125 lbs", card: "prelim", methods: ["KO/TKO", "Submission", "Decision", "DQ"] },
    ],
  },
  {
    id: "kape_horiguchi",
    event: "UFC FIGHT NIGHT",
    subtitle: "KAPE VS HORIGUCHI 2",
    date: "SAT JUNE 20, 2026",
    venue: "Meta APEX",
    location: "Las Vegas, Nevada",
    broadcast: "Paramount+ · Main Card 8PM ET · Prelims 5PM ET",
    status: "completed",
    fights: [
      { id: 1, type: "🏆 MAIN EVENT — FLYWEIGHT", f1: { name: "Manel Kape",        record: "22-7",  country: "🇦🇴", odds: "-160" }, f2: { name: "Kyoji Horiguchi",   record: "36-5",  country: "🇯🇵", odds: "+135" }, weight: "125 lbs", card: "main" },
      { id: 2, type: "CO-MAIN — LIGHT HEAVYWEIGHT", f1: { name: "Ion Cutelaba",      record: "20-11", country: "🇲🇩", odds: "+250" }, f2: { name: "Navajo Stirling",   record: "9-0",   country: "🇳🇿", odds: "-310" }, weight: "205 lbs", card: "main" },
      { id: 3, type: "FEATHERWEIGHT",              f1: { name: "Hyder Amil",        record: "11-2",  country: "🇧🇷", odds: "+165" }, f2: { name: "Christian Rodriguez",record: "12-4", country: "🇺🇸", odds: "-200" }, weight: "145 lbs", card: "main" },
      { id: 4, type: "FEATHERWEIGHT",              f1: { name: "Melsik Baghdasaryan",record: "8-3",  country: "🇦🇲", odds: "+275" }, f2: { name: "Murtazali Magomedov",record: "10-0", country: "🇷🇺", odds: "-350" }, weight: "145 lbs", card: "main" },
      { id: 5, type: "FEATHERWEIGHT",              f1: { name: "Vinicius Oliveira", record: "23-4",  country: "🇧🇷", odds: "-290" }, f2: { name: "Andre Fili",        record: "25-13", country: "🇺🇸", odds: "+235" }, weight: "145 lbs", card: "main" },
      { id: 6, type: "FLYWEIGHT",                   f1: { name: "Andre Lima",        record: "11-0",  country: "🇧🇷", odds: "-650" }, f2: { name: "Kevin Borjas",       record: "10-5",  country: "🇵🇪", odds: "+475" }, weight: "125 lbs", card: "prelim" },
      { id: 7, type: "WOMEN'S BANTAMWEIGHT",        f1: { name: "Bia Mesquita",      record: "7-0",   country: "🇧🇷", odds: "-575" }, f2: { name: "Melissa Mullins",    record: "7-2",   country: "🇬🇧", odds: "+425" }, weight: "135 lbs", card: "prelim" },
      { id: 8, type: "FLYWEIGHT",                   f1: { name: "Allan Nascimento",  record: "22-6",  country: "🇧🇷", odds: "-310" }, f2: { name: "Mitch Raposo",       record: "10-3",  country: "🇺🇸", odds: "+250" }, weight: "125 lbs", card: "prelim" },
      { id: 9, type: "BANTAMWEIGHT",                f1: { name: "Gaston Bolanos",    record: "8-5",   country: "🇵🇪", odds: "+200" }, f2: { name: "Michael Aswell Jr.", record: "11-4",  country: "🇺🇸", odds: "-250" }, weight: "135 lbs", card: "prelim" },
    ],
  },
  {
    id: "freedom250",
    event: "UFC FREEDOM 250",
    subtitle: "UFC AT THE WHITE HOUSE",
    date: "SUN JUNE 14, 2026",
    venue: "South Lawn, The White House",
    location: "Washington, D.C.",
    broadcast: "Paramount+ · 8PM ET",
    status: "completed",
    fights: [
      { id: 1, type: "🏆 LIGHTWEIGHT TITLE",      f1: { name: "Ilia Topuria",    record: "17-0", country: "🇬🇪", odds: "-535" }, f2: { name: "Justin Gaethje",  record: "27-5", country: "🇺🇸", odds: "+400" }, weight: "155 lbs", card: "main" },
      { id: 2, type: "🏆 INTERIM HVY TITLE",      f1: { name: "Alex Pereira",    record: "13-3", country: "🇧🇷", odds: "-105" }, f2: { name: "Ciryl Gane",      record: "13-2", country: "🇫🇷", odds: "-115" }, weight: "265 lbs", card: "main" },
      { id: 3, type: "BANTAMWEIGHT",               f1: { name: "Sean O'Malley",   record: "19-3", country: "🇺🇸", odds: "-440" }, f2: { name: "Aiemann Zahabi",  record: "14-2", country: "🇨🇦", odds: "+340" }, weight: "135 lbs", card: "main" },
      { id: 4, type: "HEAVYWEIGHT",                f1: { name: "Josh Hokit",      record: "9-0",  country: "🇺🇸", odds: "-410" }, f2: { name: "Derrick Lewis",    record: "29-13",country: "🇺🇸", odds: "+320" }, weight: "265 lbs", card: "main" },
      { id: 5, type: "LIGHTWEIGHT",                f1: { name: "Mauricio Ruffy",  record: "13-2", country: "🇧🇷", odds: "-700" }, f2: { name: "Michael Chandler", record: "23-10",country: "🇺🇸", odds: "+500" }, weight: "155 lbs", card: "main" },
      { id: 6, type: "MIDDLEWEIGHT",               f1: { name: "Bo Nickal",       record: "8-1",  country: "🇺🇸", odds: "-355" }, f2: { name: "Kyle Daukaus",    record: "17-4", country: "🇺🇸", odds: "+280" }, weight: "185 lbs", card: "main" },
      { id: 7, type: "FEATHERWEIGHT",              f1: { name: "Diego Lopes",     record: "27-8", country: "🇧🇷", odds: "-162" }, f2: { name: "Steve Garcia",     record: "19-5", country: "🇺🇸", odds: "+138" }, weight: "145 lbs", card: "main" },
    ],
  },
];

// ── STYLES ─────────────────────────────────────────────────────
const S = {
  app:    { fontFamily: "'Bebas Neue', Impact, sans-serif", background: C.black, minHeight: "100vh", color: C.white, maxWidth: 430, margin: "0 auto", position: "relative", overflowX: "hidden" },
  header: { background: "rgba(10,10,10,0.97)", borderBottom: `2px solid ${C.pink}`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 },
  pageHdr:{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderBottom: `1px solid ${C.border}` },
  backBtn:{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", color: C.white, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  avatar: { width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${C.pink}, ${C.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: "bold", cursor: "pointer", color: C.white },
  input:  { width: "100%", background: "rgba(255,255,255,0.06)", border: `1px solid rgba(255,255,255,0.12)`, borderRadius: 10, padding: "14px 16px", color: C.white, fontSize: 16, fontFamily: "Arial, sans-serif", marginBottom: 14, outline: "none", boxSizing: "border-box" },
  btnPink:{ width: "100%", background: `linear-gradient(135deg, ${C.pink}, #C00090)`, border: "none", borderRadius: 10, padding: "15px", color: C.white, fontSize: 20, fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: 4, cursor: "pointer", boxShadow: `0 4px 20px ${C.pink}55` },
  btnCyan:{ width: "100%", background: "transparent", border: `2px solid ${C.cyan}`, borderRadius: 10, padding: "13px", color: C.cyan, fontSize: 18, fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: 4, cursor: "pointer", marginTop: 10 },
  btnGold:{ background: `linear-gradient(135deg, ${C.gold}, #E6A000)`, border: "none", borderRadius: 8, padding: "10px 16px", color: "#000", fontSize: 14, fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: 2, cursor: "pointer" },
  card:   { background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, marginBottom: 12, overflow: "hidden" },
  secLbl: { fontSize: 12, letterSpacing: 4, color: C.gray, padding: "18px 20px 8px", fontFamily: "Arial, sans-serif" },
  modal:  { position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 200, display: "flex", alignItems: "flex-end" },
  modalBox:{ background: "#161616", borderRadius: "20px 20px 0 0", padding: "28px 24px", width: "100%", border: `2px solid rgba(255,255,255,0.1)`, maxHeight: "88vh", overflowY: "auto" },
  navBar: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "rgba(10,10,10,0.99)", borderTop: `2px solid ${C.pink}`, display: "flex", justifyContent: "space-around", padding: "10px 0 20px", zIndex: 999, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" },
  navItem:{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", padding: "4px 8px", borderRadius: 10 },
};

// ── BOTTOM NAV ─────────────────────────────────────────────────
function BottomNav({ active, setActive, onReset }) {
  const tabs = [
    { id: "home",      icon: "🏠", label: "HOME"     },
    { id: "community", icon: "💬", label: "COMMUNITY" },
    { id: "ufc",       icon: "🏟️", label: "UFC BETS" },
    { id: "coaching",  icon: "🎓", label: "COACHING" },
    { id: "profile",   icon: "👤", label: "ME"       },
  ];
  return (
    <div style={S.navBar}>
      {tabs.map(t => {
        const on = active === t.id;
        return (
          <div key={t.id} style={{ ...S.navItem, background: on ? "rgba(255,20,147,0.12)" : "transparent" }}
            onClick={() => { onReset(); setActive(t.id); }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 9, letterSpacing: 1, fontFamily: "Arial, sans-serif", color: on ? C.pink : C.gray }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── SECTION SEARCH BAR (with fuzzy dropdown) ────────────────────
// Lives at the top of any video list. Searches only the videos passed in,
// shows a dropdown of fuzzy matches (locked ones included, just marked),
// and scrolls/highlights the matching card when tapped.
function SectionSearchBar({ vids, query, setQuery, onPick, color, isPro, freeCount }) {
  const q = query.trim();
  const results = q ? vids
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => fuzzyMatch(v.title, q))
    : [];
  return (
    <div style={{ position: "relative", marginBottom: 14 }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#999", pointerEvents: "none", zIndex: 2 }}>🔍</span>
        <input
          style={{ width: "100%", background: "#FFFFFF", border: `2px solid ${q ? color : "rgba(0,0,0,0.12)"}`, borderRadius: 12, padding: "12px 38px 12px 40px", color: "#111111", fontSize: 14, fontFamily: "Arial, sans-serif", outline: "none", boxSizing: "border-box", boxShadow: q ? `0 4px 16px ${color}33` : "0 2px 8px rgba(0,0,0,0.12)" }}
          placeholder="Search videos in this section..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {q && (
          <button onClick={() => setQuery("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.1)", border: "none", color: "#555", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 13, zIndex: 2 }}>✕</button>
        )}
      </div>
      {q && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#FFFFFF", borderRadius: 12, boxShadow: "0 8px 28px rgba(0,0,0,0.25)", overflow: "hidden", zIndex: 50, border: "1px solid rgba(0,0,0,0.1)", maxHeight: 280, overflowY: "auto" }}>
          {results.length === 0 ? (
            <div style={{ padding: "14px 16px", fontFamily: "Arial, sans-serif", color: "#666", fontSize: 13 }}>
              No matches for "<strong>{query}</strong>" in this section
            </div>
          ) : results.map(({ v, i }) => {
            const locked = !isPro && i >= freeCount;
            return (
              <div key={i} onClick={() => onPick(i)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid rgba(0,0,0,0.05)", cursor: "pointer" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{locked ? "🔒" : "▶️"}</span>
                <div style={{ fontFamily: "Arial, sans-serif", fontSize: 13, color: "#111", fontWeight: "600", flex: 1 }}>{v.title}</div>
                {locked && <span style={{ fontSize: 9, fontFamily: "Arial, sans-serif", color: "#999", letterSpacing: 1, flexShrink: 0 }}>PRO</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── VIDEO CARD (compact grid style) ──────────────────────────────
function VideoCard({ v, index, isPro, onLock, onFav, isFav, highlighted, cardId }) {
  // 0-4: free (5 videos), 5+: locked — but title always stays visible
  const locked = !isPro && index >= 5;
  const thumb  = getYTThumb(v.youtubeUrl);
  return (
    <div id={cardId} style={{ ...S.card, position: "relative", margin: 0, border: highlighted ? `2px solid ${C.pink}` : S.card.border, boxShadow: highlighted ? `0 0 0 4px ${C.pink}33` : "none", transition: "box-shadow 0.3s, border-color 0.3s" }}>
      {locked && (
        <div onClick={onLock} style={{ position: "absolute", inset: 0, zIndex: 10, borderRadius: 14, background: "rgba(10,10,10,0.82)", backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 6, padding: "10px" }}>
          <div style={{ fontSize: 24 }}>🔒</div>
          <div style={{ fontSize: 11, letterSpacing: 1, color: C.white, textAlign: "center", lineHeight: 1.25 }}>{v.title}</div>
          <div style={{ background: `linear-gradient(135deg,${C.pink},#C00090)`, borderRadius: 16, padding: "5px 12px", fontSize: 10, letterSpacing: 1, color: C.white, marginTop: 2, textAlign: "center" }}>UNLOCK PRO</div>
        </div>
      )}
      <div
        onClick={() => locked ? onLock() : v.youtubeUrl ? window.open(v.youtubeUrl, "_blank") : null}
        style={{ aspectRatio: "1 / 1", background: thumb ? `url(${thumb}) center/cover no-repeat` : `linear-gradient(135deg,rgba(255,20,147,0.25),rgba(0,207,255,0.15),#111)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", cursor: "pointer", filter: locked ? "blur(4px)" : "none" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", borderRadius: "14px 14px 0 0" }} />
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: v.youtubeUrl ? "rgba(255,20,147,0.9)" : "rgba(80,80,80,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, position: "relative", zIndex: 1, boxShadow: v.youtubeUrl ? `0 0 16px ${C.pink}88` : "none" }}>▶</div>
        {index === 4 && !isPro && <div style={{ position: "absolute", bottom: 6, left: 6, background: `${C.gold}dd`, borderRadius: 5, padding: "2px 7px", fontSize: 8, letterSpacing: 1, zIndex: 1, color: "#000" }}>LAST FREE</div>}
        <button onClick={(e) => { e.stopPropagation(); locked ? onLock() : onFav(); }} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 14, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {locked ? "🔒" : isFav ? "❤️" : "🤍"}
        </button>
      </div>
      <div style={{ padding: "9px 10px" }}>
        <div style={{ fontSize: 12, letterSpacing: 0.5, lineHeight: 1.25, color: C.white, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 30 }}>{v.title}</div>
      </div>
    </div>
  );
}

// ── PICKER CARD ────────────────────────────────────────────────
function PickerCard({ icon, name, sub, count, color, onClick }) {
  return (
    <div onClick={onClick} style={{ background: `linear-gradient(135deg,${color}15,rgba(255,255,255,0.02))`, border: `1px solid ${color}44`, borderRadius: 16, padding: "20px", marginBottom: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 38 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 22, letterSpacing: 3, color: C.white }}>{name}</div>
          {sub  && <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 3 }}>{sub}</div>}
          {count !== undefined && <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color, marginTop: 3 }}>{count} videos</div>}
        </div>
      </div>
      <div style={{ color, fontSize: 22 }}>›</div>
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────
export default function MMAManualApp() {
  // Auth
  const [user,     setUser]     = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [form,     setForm]     = useState({ name: "", username: "", email: "", password: "" });

  // Navigation
  const [activeTab, setActiveTab] = useState("home");

  // Drill-down: category -> discipline -> offense|defense -> section -> videos
  const [selCategory,   setSelCategory]   = useState(null); // "standup"|"ground"
  const [selDiscipline, setSelDiscipline] = useState(null); // "boxing" etc
  const [selSide,       setSelSide]       = useState(null); // "offense"|"defense"
  const [selSection,    setSelSection]    = useState(null); // "Submissions" etc

  // Drills-only: optional named sub-list inside a drill discipline (e.g. "Boxing Drills")
  const [selDrillCat, setSelDrillCat] = useState(null);

  // In-section search (fuzzy dropdown above the video grid)
  const [sectionSearchQ,  setSectionSearchQ]  = useState("");
  const [highlightVidIdx, setHighlightVidIdx] = useState(null);

  // Subscription
  const [isPro,        setIsPro]        = useState(false);
  const [showPaywall,  setShowPaywall]  = useState(false);
  const [selPlan,      setSelPlan]      = useState("annual");
  const [paywallStep,  setPaywallStep]  = useState("plans"); // plans | trial | payment | processing | success
  const [cardForm,     setCardForm]     = useState({ name: "", email: "", number: "", expiry: "", cvv: "" });
  const [cardErrors,   setCardErrors]   = useState({});
  const [trialActive,  setTrialActive]  = useState(false);

  // Favourites
  const [favourites, setFavourites] = useState([]);
  const isFav = (title) => favourites.some(f => f.title === title);
  const toggleFav = (v, discipline, side, section) => {
    setFavourites(prev => isFav(v.title) ? prev.filter(f => f.title !== v.title) : [...prev, { ...v, discipline, side, section }]);
  };

  // Videos
  const [videos, setVideos] = useState(INITIAL_VIDEOS);

  // Bounty
  const [bounties, setBounties]     = useState(BOUNTY_REQUESTS_INIT);
  const [bountyFilter, setBountyFilter] = useState("all");
  const [bountyModal,  setBountyModal]  = useState(false);
  const [claimModal,   setClaimModal]   = useState(null);
  const [bountyForm,   setBountyForm]   = useState({ move: "", discipline: "bjj", side: "offense", section: "" });

  // Search
  const [searchQ, setSearchQ] = useState("");

  // Modals
  const [uploadModal, setUploadModal] = useState(false);

  // Community
  const [commView,    setCommView]    = useState("hub");   // hub | feed | gym | chat | newpost | donate
  const [activeHubGroup, setActiveHubGroup] = useState(null);
  const [hubMessages, setHubMessages] = useState({});
  const [fbLoading, setFbLoading] = useState(false);

  // Sync active group messages from Firebase in real time
  useEffect(() => {
    if (!activeHubGroup) return;
    setFbLoading(true);
    const stop = fbListen(`hub_messages/${activeHubGroup}`, (data) => {
      if (data) {
        const msgs = Object.entries(data).map(([key, val]) => ({ ...val, _key: key })).sort((a,b) => (a.ts||0) - (b.ts||0));
        setHubMessages(prev => ({ ...prev, [activeHubGroup]: msgs }));
      } else {
        setHubMessages(prev => ({ ...prev, [activeHubGroup]: [] }));
      }
      setFbLoading(false);
    });
    return stop;
  }, [activeHubGroup]);

  // Sync team chat from Firebase
  useEffect(() => {
    if (!userTeam?.id && userTeam?.id !== 0) return;
    const teamKey = `team_${userTeam.id}_chat`;
    const stop = fbListen(`team_chats/${teamKey}`, (data) => {
      if (data) {
        const msgs = Object.entries(data).map(([key, val]) => ({ ...val, _key: key })).sort((a,b) => (a.ts||0) - (b.ts||0));
        setTeamMessages(msgs);
      } else setTeamMessages([]);
    });
    return stop;
  }, [userTeam?.id]);

  // Sync assigned drills from Firebase
  useEffect(() => {
    if (!userTeam?.id && userTeam?.id !== 0) return;
    const stop = fbListen(`team_drills/${userTeam.id}`, (data) => {
      if (data) setAssignedDrills(Object.entries(data).map(([k,v]) => ({ ...v, _key: k })));
      else setAssignedDrills([]);
    });
    return stop;
  }, [userTeam?.id]);

  // Sync drill requests from Firebase
  useEffect(() => {
    if (!userTeam?.id && userTeam?.id !== 0) return;
    const stop = fbListen(`team_requests/${userTeam.id}`, (data) => {
      if (data) setDrillRequests(Object.entries(data).map(([k,v]) => ({ ...v, _key: k })));
      else setDrillRequests([]);
    });
    return stop;
  }, [userTeam?.id]);
  const [hubMsgInput, setHubMsgInput] = useState("");
  const [hubReplyTo, setHubReplyTo] = useState(null); // { msgIdx, author }
  const [showEmojiPicker, setShowEmojiPicker] = useState(null); // msgIdx
  const [pollModal, setPollModal] = useState(false);
  const [pollForm, setPollForm] = useState({ question: "", options: ["", ""] });
  const [showMsgOptions, setShowMsgOptions] = useState(null); // msgIdx
  const [commPosts,   setCommPosts]   = useState([
    { id: 1, author: "Coach MMA",    avatar: "C", team: "American Top Team", time: "2h ago",  likes: 24, comments: 3,  text: "Just dropped new BJJ submissions content 🔥 Check out the Buggy Choke breakdown in the app!", pinned: true  },
    { id: 2, author: "Grapple King", avatar: "G", team: "Gracie Barra",       time: "4h ago",  likes: 11, comments: 1,  text: "Question — what's the best way to set up the triangle from closed guard when your opponent is stacking you?" },
    { id: 3, author: "StrikeForce",  avatar: "S", team: "Jackson-Wink MMA",   time: "1d ago",  likes: 38, comments: 7,  text: "Sparring session with the boxing squad today — reminder that head movement is everything. Slip the jab, make them pay 🥊" },
    { id: 4, author: "Mat Warrior",  avatar: "M", team: "AKA",                time: "1d ago",  likes: 6,  comments: 0,  text: "Anyone else finding the collar tie series super useful for wrestling entries? The hand fighting video is 🔒 gold" },
    { id: 5, author: "Bkk Nak Muay", avatar: "B", team: "Tiger Muay Thai",    time: "2d ago",  likes: 19, comments: 4,  text: "Muay Thai footwork is criminally underrated in MMA. Most fighters only drill their hands. Your feet are your foundation!" },
  ]);
  const [newPostText,  setNewPostText]  = useState("");
  const [openPost,     setOpenPost]     = useState(null);
  const [commentText,  setCommentText]  = useState("");
  const [postComments, setPostComments] = useState({
    1: [{ author: "StrikeForce", avatar: "S", text: "Just watched it — the entry from guard is 🔥", time: "1h ago" }],
    2: [{ author: "Coach MMA",   avatar: "C", text: "Keep your elbows in tight and control the posture first. Don't rush the triangle.", time: "3h ago" }],
    3: [{ author: "Mat Warrior", avatar: "M", text: "Facts. Had my nose broken learning this lesson 😅", time: "20h ago" }],
  });
  const [userTeam,    setUserTeam]    = useState(null);
  const [teamView,    setTeamView]    = useState("chat"); // chat | drills | members | requests
  const [teamMessages, setTeamMessages] = useState([]);
  const [teamMsgInput, setTeamMsgInput] = useState("");
  const [teamReplyTo,  setTeamReplyTo]  = useState(null);
  const [teamEmojiPicker, setTeamEmojiPicker] = useState(null);
  const [teamPollModal, setTeamPollModal] = useState(false);
  const [teamPollForm,  setTeamPollForm]  = useState({ question: "", options: ["", ""] });
  const [assignedDrills, setAssignedDrills] = useState([]);
  const [drillRequests,  setDrillRequests]  = useState([]);
  const [drillRequestInput, setDrillRequestInput] = useState("");
  const [assignDrillModal, setAssignDrillModal] = useState(false);
  const [teamJoinModal, setTeamJoinModal] = useState(false);
  const [teamJoinName,  setTeamJoinName]  = useState("");
  const [teamCreateModal, setTeamCreateModal] = useState(false);
  const [teamCreateName,  setTeamCreateName]  = useState("");
  const [gymSearch,   setGymSearch]   = useState("");
  const [donateAmt,   setDonateAmt]   = useState("");
  const [showGymPick, setShowGymPick] = useState(false);
  const [liveMessages, setLiveMessages] = useState([
    { author: "Coach MMA",    avatar: "C", team: "ATT",            text: "Welcome to The MMA Manual Live Chat! 🥋", time: "10m ago" },
    { author: "Bkk Nak Muay", avatar: "B", team: "Tiger Muay Thai",text: "Let's go! Great platform 🔥",             time: "8m ago"  },
    { author: "Grapple King", avatar: "G", team: "Gracie Barra",   text: "Anyone want to drill Saturday?",          time: "5m ago"  },
  ]);
  const [liveMsg, setLiveMsg] = useState("");

  // ── UFC PICKS STATE ──
  const [ufcPicks,    setUfcPicks]    = useState({}); // { "cardId_fightId": "f1"|"f2" }
  const [ufcView,     setUfcView]     = useState("cards"); // cards | history | carddetail
  const [selectedCard,setSelectedCard]= useState(UFC_CARDS.find(c => c.status !== "completed")?.id || UFC_CARDS[0].id);
  const [tmmTokens,   setTmmTokens]   = useState(500); // TMM play money — $500 on registration
  const [ufcBets,     setUfcBets]     = useState({}); // { "cardId_fightId": { side, method, amount } }
  const [betModal,    setBetModal]    = useState(null); // fight object when open
  const [betForm,     setBetForm]     = useState({ side: null, method: null, amount: "" });
  const [fightChat,   setFightChat]   = useState({}); // { "cardId_fightId": [messages] }
  const [fightChatModal, setFightChatModal] = useState(null);
  const [fightChatMsg, setFightChatMsg] = useState("");
  const [ufcSubView,  setUfcSubView]  = useState("picks"); // picks | bets | discuss | results
  const [lockedCards, setLockedCards] = useState({});
  const [cardFilter,  setCardFilter]  = useState("main"); // main | prelim
  // Simulated historical pick records for demo
  const [pickHistory] = useState([
    {
      cardId: "ufc310", event: "UFC 310", date: "Dec 7, 2024", status: "completed",
      picks: [
        { fight: "Pantoja vs Asakura",     myPick: "Pantoja",    result: "Pantoja",    correct: true  },
        { fight: "Shevchenko vs Fiorot",   myPick: "Fiorot",     result: "Shevchenko", correct: false },
        { fight: "Dariush vs Gamrot",      myPick: "Dariush",    result: "Dariush",    correct: true  },
        { fight: "Tuivasa vs Rozenstruik", myPick: "Tuivasa",    result: "Tuivasa",    correct: true  },
        { fight: "Yan vs Figueiredo",      myPick: "Yan",        result: "Figueiredo", correct: false },
      ],
    },
    {
      cardId: "ufc311", event: "UFC 311", date: "Jan 18, 2025", status: "completed",
      picks: [
        { fight: "Makhachev vs Moicano",   myPick: "Makhachev",  result: "Makhachev",  correct: true  },
        { fight: "Ngannou vs Jones",        myPick: "Jones",      result: "Jones",      correct: true  },
        { fight: "Pantoja vs Asakura",     myPick: "Asakura",    result: "Pantoja",    correct: false },
        { fight: "Oliveira vs Chandler",   myPick: "Oliveira",   result: "Oliveira",   correct: true  },
      ],
    },
    {
      cardId: "ufc312", event: "UFC 312", date: "Feb 22, 2025", status: "completed",
      picks: [
        { fight: "Du Plessis vs Strickland", myPick: "Du Plessis", result: "Du Plessis", correct: true  },
        { fight: "Zhang vs Yan",             myPick: "Zhang",      result: "Zhang",      correct: true  },
        { fight: "Tuivasa vs Tybura",        myPick: "Tuivasa",    result: "Tybura",     correct: false },
      ],
    },
    {
      cardId: "freedom250", event: "UFC Freedom 250", date: "Jun 14, 2026", status: "completed",
      picks: [
        { fight: "Topuria vs Gaethje",   myPick: "Ilia Topuria",   result: "Ilia Topuria",   correct: true  },
        { fight: "Pereira vs Gane",      myPick: "Alex Pereira",   result: "Ciryl Gane",     correct: false },
        { fight: "O'Malley vs Zahabi",   myPick: "Sean O'Malley",  result: "Sean O'Malley",  correct: true  },
        { fight: "Hokit vs Lewis",       myPick: "Josh Hokit",     result: "Josh Hokit",     correct: true  },
        { fight: "Ruffy vs Chandler",    myPick: "Mauricio Ruffy", result: "Mauricio Ruffy", correct: true  },
        { fight: "Nickal vs Daukaus",    myPick: "Bo Nickal",      result: "Bo Nickal",      correct: true  },
        { fight: "Lopes vs Garcia",      myPick: "Diego Lopes",    result: "Diego Lopes",    correct: true  },
      ],
    },
    {
      cardId: "kape_horiguchi", event: "UFC Fight Night: Kape vs Horiguchi 2", date: "Jun 20, 2026", status: "completed",
      picks: [
        { fight: "Kape vs Horiguchi",          myPick: "Manel Kape",        result: "Manel Kape",        correct: true  },
        { fight: "Cutelaba vs Stirling",       myPick: "Navajo Stirling",   result: "Navajo Stirling",   correct: true  },
        { fight: "Amil vs Rodriguez",          myPick: "Christian Rodriguez",result: "Christian Rodriguez",correct: true },
        { fight: "Baghdasaryan vs Magomedov",  myPick: "Murtazali Magomedov",result: "Murtazali Magomedov",correct: true },
        { fight: "Oliveira vs Fili",           myPick: "Vinicius Oliveira", result: "Vinicius Oliveira", correct: true  },
        { fight: "Lima vs Borjas",             myPick: "Andre Lima",       result: "Kevin Borjas",      correct: false },
        { fight: "Mesquita vs Mullins",        myPick: "Bia Mesquita",      result: "Bia Mesquita",      correct: true  },
        { fight: "Nascimento vs Raposo",       myPick: "Allan Nascimento", result: "Mitch Raposo",      correct: false },
        { fight: "Bolanos vs Aswell",          myPick: "Michael Aswell Jr.",result: "Gaston Bolanos",   correct: false },
      ],
    },
  ]);

  // ── TEAMS STATE ──
  const [teamsView,    setTeamsView]    = useState("browse"); // browse | team | create | share
  const [myTeams,      setMyTeams]      = useState([]);
  const [allTeams,     setAllTeams]     = useState([
    { id: 1, name: "Wrestling Crew",    icon: "💪", color: C.cyan,  members: ["@grappleking","@matwarrior","@ironsprawl"], desc: "Takedowns, scrambles & top control. All levels welcome.", chat: [{ from: "Grapple King", avatar: "G", text: "Anyone drilling double legs Thursday?", time: "2h ago" }, { from: "Mat Warrior", avatar: "M", text: "I'm in! 6pm?", time: "1h ago" }], sharedVideos: [], joined: false },
    { id: 2, name: "BJJ Submissions",   icon: "🥋", color: C.pink,  members: ["@coach_mma","@grappleking"],               desc: "Chokes, armbars, joint locks. Tap or nap.", chat: [{ from: "Coach MMA", avatar: "C", text: "New Buggy Choke breakdown is live in the app 🔥", time: "3h ago" }], sharedVideos: [], joined: false },
    { id: 3, name: "Striking Squad",    icon: "🥊", color: C.pink,  members: ["@strikeforce","@nkm_bkk"],                 desc: "Boxing, Kickboxing & Muay Thai. Hands, feet, elbows.", chat: [{ from: "StrikeForce", avatar: "S", text: "The slip drill video is gold — adding to homework list", time: "5h ago" }], sharedVideos: [], joined: false },
    { id: 4, name: "Muay Thai Camp",    icon: "🏆", color: "#FF6600",members: ["@nkm_bkk"],                               desc: "Nak Muay only. Clinch, teep, elbows & knees.", chat: [], sharedVideos: [], joined: false },
    { id: 5, name: "ATT Members",       icon: "🦅", color: C.gold,  members: ["@coach_mma","@strikeforce"],               desc: "American Top Team — students & coaches only.", chat: [{ from: "Coach MMA", avatar: "C", text: "Saturday open mat at 10am sharp 💪", time: "1d ago" }], sharedVideos: [], joined: false },
  ]);
  const [selectedTeam,   setSelectedTeam]   = useState(null);
  const [teamMsg,        setTeamMsg]        = useState("");
  const [createTeamForm, setCreateTeamForm] = useState({ name: "", desc: "", icon: "👥" });
  const [shareVideoModal,setShareVideoModal] = useState(false);

  // ── COACHING STATE ──
  const [coachingView,   setCoachingView]   = useState("home");
  // home | roster | studentview | schedule | builddrill | invites | findcoach | mycoach
  const [isCoach,        setIsCoach]        = useState(false);
  const [coachProfile,   setCoachProfile]   = useState({ gym: "", specialty: "", bio: "" });

  // Roster: confirmed coach<->student relationships
  const [roster, setRoster] = useState([
    { id: 1, name: "Student A", username: "@student_a", avatar: "A", level: "Beginner",     lastSeen: "2h ago", belt: "Blue",   stripes: 1, grade: "B+", notes: "Strong guard retention, needs work on takedown defense. Gas tank improving each week." },
    { id: 2, name: "Student B", username: "@student_b", avatar: "B", level: "Intermediate",  lastSeen: "1d ago", belt: "Purple", stripes: 2, grade: "A-", notes: "Excellent submission chaining from back control. Footwork on the feet still a bit flat — drill pivots." },
    { id: 3, name: "Student C", username: "@student_c", avatar: "C", level: "Advanced",      lastSeen: "3h ago", belt: "Brown",  stripes: 0, grade: "A",  notes: "Ready for competition. Keep sharpening leg lock entries and timing on the jab." },
  ]);
  const BELTS = ["White", "Blue", "Purple", "Brown", "Black"];
  const BELT_COLORS = { White: "#F5F5F5", Blue: "#1565C0", Purple: "#6A1B9A", Brown: "#5D4037", Black: "#0A0A0A" };
  const GRADES = ["A+","A","A-","B+","B","B-","C+","C","C-","D"];
  const gradeColor = (g) => g.startsWith("A") ? C.green : g.startsWith("B") ? C.cyan : g.startsWith("C") ? C.gold : "#FF4444";
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm,    setProfileForm]    = useState({ belt: "White", stripes: 0, grade: "C", notes: "" });
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Invitations — coach→student and student→coach, pending until accepted
  const [invitesSent,     setInvitesSent]     = useState([]); // [{ id, to, from, type: "coach_to_student"|"student_to_coach", status: "pending" }]
  const [invitesReceived, setInvitesReceived] = useState([
    { id: 1, from: "@coach_mma", fromName: "Coach MMA", type: "coach_to_student", status: "pending", time: "2h ago" },
  ]);
  const [inviteSearch,    setInviteSearch]    = useState("");
  const [myCoach,         setMyCoach]         = useState(null); // { username, name } once a student accepts

  // Custom workouts (non-video drills the coach can program)
  const [customWorkouts, setCustomWorkouts] = useState([
    { id: 1, name: "Sprint Conditioning",  desc: "5x 400m sprints, 90s rest between", category: "Conditioning" },
    { id: 2, name: "Core Circuit",         desc: "3 rounds: planks, leg raises, Russian twists — 45s each", category: "Strength" },
    { id: 3, name: "Shadow Boxing Rounds", desc: "5x 3min rounds, focus on combos + footwork", category: "Striking" },
  ]);
  const [workoutModal, setWorkoutModal] = useState(false);
  const [newWorkout,   setNewWorkout]   = useState({ name: "", desc: "", category: "Conditioning" });

  // Weekly schedule: studentUsername -> array of time slots
  // Each slot: { id, day, time, type: "video"|"workout"|"focus", title, detail }
  const [schedules, setSchedules] = useState({
    "@student_a": [
      { id: 1, day: "Mon", time: "6:00 PM", type: "video",  title: "How to Throw The Perfect Jab", detail: "Boxing · Punches & Combos" },
      { id: 2, day: "Wed", time: "6:00 PM", type: "workout", title: "Shadow Boxing Rounds",          detail: "5x 3min rounds" },
      { id: 3, day: "Fri", time: "5:30 PM", type: "focus",   title: "Guard Retention",               detail: "Focus technique for the week" },
    ],
    "@student_b": [
      { id: 4, day: "Tue", time: "7:00 PM", type: "video", title: "The Buggy Choke", detail: "BJJ · Submissions" },
    ],
    "@student_c": [],
  });
  const [slotModal,  setSlotModal]  = useState(false);
  const [editingSlot,setEditingSlot]= useState(null); // slot being created/edited
  const [slotForm,   setSlotForm]   = useState({ day: "Mon", time: "6:00 PM", type: "video", title: "", detail: "" });
  const [pickerOpen,  setPickerOpen] = useState(false); // video/workout picker inside slot modal
  const [videoPickerSearch, setVideoPickerSearch] = useState("");

  const [coachMsgs, setCoachMsgs] = useState({
    1: [{ from: "Coach", text: "Focus on your guard retention this week — watch the Shrimp video daily.", time: "1d ago" }],
    2: [{ from: "Coach", text: "Great session Wednesday! Work on the collar tie setups before Saturday.", time: "2d ago" }],
    3: [],
  });
  const [coachMsgInput, setCoachMsgInput] = useState("");
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const GYMS = [
    // USA
    { name: "American Top Team",      short: "ATT",         country: "🇺🇸", city: "Coconut Creek, FL"    },
    { name: "American Kickboxing Academy", short: "AKA",    country: "🇺🇸", city: "San Jose, CA"          },
    { name: "Jackson-Wink MMA",       short: "JW-MMA",      country: "🇺🇸", city: "Albuquerque, NM"       },
    { name: "Team Alpha Male",        short: "TAM",         country: "🇺🇸", city: "Sacramento, CA"        },
    { name: "Roufusport",             short: "ROUFUS",      country: "🇺🇸", city: "Milwaukee, WI"         },
    { name: "Xtreme Couture",         short: "XC",          country: "🇺🇸", city: "Las Vegas, NV"         },
    { name: "Kill Cliff FC",          short: "KCFC",        country: "🇺🇸", city: "Atlanta, GA"           },
    { name: "Gracie Barra USA",       short: "GB-USA",      country: "🇺🇸", city: "Multiple Locations"    },
    { name: "Sanford MMA",            short: "SANFORD",     country: "🇺🇸", city: "Deerfield Beach, FL"   },
    { name: "MMA Masters",            short: "MMAM",        country: "🇺🇸", city: "Miami, FL"             },
    // Canada
    { name: "Tristar Gym",            short: "TRISTAR",     country: "🇨🇦", city: "Montreal, QC"          },
    { name: "TKO MMA",                short: "TKO",         country: "🇨🇦", city: "Montreal, QC"          },
    { name: "SBG Canada",             short: "SBG-CA",      country: "🇨🇦", city: "Calgary, AB"           },
    // Brazil
    { name: "Nova União",             short: "NU",          country: "🇧🇷", city: "Rio de Janeiro"        },
    { name: "Chute Boxe",             short: "CB",          country: "🇧🇷", city: "Curitiba"              },
    { name: "Gracie Barra Brazil",    short: "GB-BR",       country: "🇧🇷", city: "Belo Horizonte"        },
    { name: "Brazilian Top Team",     short: "BTT",         country: "🇧🇷", city: "Rio de Janeiro"        },
    { name: "Alliance MMA",           short: "ALLIANCE",    country: "🇧🇷", city: "São Paulo"             },
    // England / UK
    { name: "SBG Manchester",         short: "SBG-MAN",     country: "🇬🇧", city: "Manchester"            },
    { name: "London Shootfighters",   short: "LSF",         country: "🇬🇧", city: "London"                },
    { name: "Rough House MMA",        short: "RH",          country: "🇬🇧", city: "London"                },
    { name: "Next Generation MMA",    short: "NG-MMA",      country: "🇬🇧", city: "Liverpool"             },
    // Australia
    { name: "City Kickboxing AUS",    short: "CKB-AUS",     country: "🇦🇺", city: "Sydney"                },
    { name: "Absolute MMA",          short: "ABS",          country: "🇦🇺", city: "Melbourne"             },
    { name: "Submission FC",          short: "SFC",         country: "🇦🇺", city: "Brisbane"              },
    // New Zealand
    { name: "City Kickboxing",        short: "CKB",         country: "🇳🇿", city: "Auckland"              },
    // Ireland
    { name: "SBG Ireland",            short: "SBG-IRL",     country: "🇮🇪", city: "Dublin"                },
    // Independent
    { name: "My Local Gym",           short: "LOCAL",       country: "🏠",  city: "Independent"           },
  ];

  // ── Helpers ──
  const resetNav = () => { setSelCategory(null); setSelDiscipline(null); setSelSide(null); setSelSection(null); setSectionSearchQ(""); setHighlightVidIdx(null); setSelDrillCat(null); };

  const allVideosList = Object.entries(videos).flatMap(([disc, sides]) =>
    Object.entries(sides).flatMap(([side, sections]) =>
      Object.entries(sections).flatMap(([sec, vids]) =>
        vids.map((v, idx) => ({ ...v, discipline: disc, side, section: sec, sectionIndex: idx }))
      )
    )
  );

  const catColor = (disc) => {
    if (DISCIPLINES.standup.subs.some(s => s.id === disc) || disc === "striking_arts" || disc === "striking_drills") return C.pink;
    if (disc === "mma_drills" || disc === "grappling_drills") return "#9B5CFF";
    if (disc === "all_arts" || disc === "grappling_arts") return C.gold;
    if (disc === "ufc_fighters") return "#CC0000";
    return C.cyan;
  };

  // ── AUTH ──────────────────────────────────────────────────────
  if (!user) {
    return (
      <div style={{ ...S.app, background: `radial-gradient(ellipse at 50% 20%,rgba(255,20,147,0.18) 0%,transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(0,207,255,0.12) 0%,transparent 60%),#0A0A0A`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 18, letterSpacing: 6 }}>THE</div>
          <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: 4, lineHeight: 1, background: `linear-gradient(135deg,${C.pink} 40%,${C.cyan})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MMA</div>
          <div style={{ fontSize: 26, letterSpacing: 8, marginBottom: 12 }}>MANUAL</div>
          <div style={{ width: 60, height: 3, background: `linear-gradient(90deg,${C.pink},${C.cyan})`, margin: "0 auto", borderRadius: 2 }} />
        </div>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <div style={{ fontSize: 24, letterSpacing: 5, marginBottom: 20, textAlign: "center" }}>{authMode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}</div>
          {authMode === "signup" && <>
            <input style={S.input} placeholder="Full Name"  value={form.name}     onChange={e => setForm({ ...form, name: e.target.value })} />
            <input style={S.input} placeholder="Username"   value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
          </>}
          <input style={S.input} placeholder="Email"    type="email"    value={form.email}    onChange={e => setForm({ ...form, email: e.target.value })} />
          <input style={S.input} placeholder="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <button style={S.btnPink} onClick={() => { setUser({ name: authMode === "signup" ? (form.name || "Fighter") : (form.email.split("@")[0] || "Fighter"), username: `@${authMode === "signup" ? (form.username || "fighter1") : form.email.split("@")[0]}`, plan: "FREE MEMBER" }); }}>
            {authMode === "login" ? "SIGN IN" : "JOIN THE MANUAL"}
          </button>
          <p style={{ marginTop: 16, fontSize: 13, fontFamily: "Arial, sans-serif", color: C.gray, textAlign: "center", cursor: "pointer" }} onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>
            {authMode === "login" ? <span>No account? <span style={{ color: C.cyan, fontWeight: "bold" }}>Sign up free</span></span> : <span>Already a member? <span style={{ color: C.cyan, fontWeight: "bold" }}>Sign in</span></span>}
          </p>
        </div>
      </div>
    );
  }

  // ── PAYWALL ───────────────────────────────────────────────────
  if (showPaywall) {
    const plans = [
      { id: "monthly", label: "MONTHLY", price: "$1.99", period: "/month", sub: "Cancel anytime", badge: null, savings: null },
      { id: "annual",  label: "ANNUAL",  price: "$19.99", period: "/year", sub: "Only $1.67/mo · Save $4", badge: "BEST VALUE", savings: "SAVE 17%" },
    ];

    const formatCard = (val) => val.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19);
    const formatExpiry = (val) => { const d = val.replace(/\D/g, ""); return d.length >= 2 ? `${d.slice(0,2)}/${d.slice(2,4)}` : d; };

    const validateCard = () => {
      const errs = {};
      if (!cardForm.name.trim()) errs.name = "Name required";
      if (!cardForm.email || !cardForm.email.includes("@")) errs.email = "Valid email required";
      if (cardForm.number.replace(/\s/g,"").length < 16) errs.number = "Enter a valid 16-digit card number";
      if (cardForm.expiry.length < 5) errs.expiry = "Enter MM/YY";
      if (cardForm.cvv.length < 3) errs.cvv = "Enter 3-digit CVV";
      setCardErrors(errs);
      return Object.keys(errs).length === 0;
    };

    const processPayment = async (isTrial) => {
      if (!validateCard()) return;
      setPaywallStep("processing");
      try {
        // Load Stripe.js and create a payment method from card details
        const stripe = await loadStripe();
        const [expMonth, expYear] = cardForm.expiry.split("/");
        const { paymentMethod, error } = await stripe.createPaymentMethod({
          type: "card",
          card: {
            number: cardForm.number.replace(/\s/g, ""),
            exp_month: parseInt(expMonth),
            exp_year: parseInt("20" + expYear),
            cvc: cardForm.cvv,
          },
          billing_details: { name: cardForm.name, email: cardForm.email },
        });

        if (error) {
          setCardErrors({ number: error.message });
          setPaywallStep(isTrial ? "trial" : "payment");
          return;
        }

        // Call Netlify Function to create the subscription
        const res = await fetch("/.netlify/functions/create-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethodId: paymentMethod.id,
            plan: selPlan,
            email: cardForm.email,
            name: cardForm.name,
            isTrial,
          }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Handle any additional authentication (3D Secure etc.)
        if (data.clientSecret) {
          const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret);
          if (confirmError) throw new Error(confirmError.message);
        }

        setPaywallStep("success");
        if (isTrial) setTrialActive(true);
        else setIsPro(true);

      } catch (err) {
        setCardErrors({ number: err.message || "Payment failed — please try again" });
        setPaywallStep(isTrial ? "trial" : "payment");
      }
    };

    const handleStartTrial = () => processPayment(true);
    const handleSubscribe  = () => processPayment(false);

    const closePaywall = () => { setShowPaywall(false); setPaywallStep("plans"); setCardForm({ name: "", email: "", number: "", expiry: "", cvv: "" }); setCardErrors({}); };

    // ── SUCCESS ──
    if (paywallStep === "success") {
      return (
        <div style={{ ...S.app, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 28, letterSpacing: 3, color: C.green, marginBottom: 8 }}>{trialActive && !isPro ? "TRIAL STARTED!" : "WELCOME TO PRO!"}</div>
          <div style={{ fontFamily: "Arial, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, marginBottom: 32 }}>
            {trialActive && !isPro
              ? `Your 7-day free trial has started!\nYou won't be charged until ${new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString('en-US',{month:'long',day:'numeric'})}. Enjoy full access to The MMA Manual!`
              : "You now have full access to every technique, drill and coaching tool in The MMA Manual!"}
          </div>
          <button style={{ ...S.btnPink, background: `linear-gradient(135deg,${C.green},#009944)`, fontSize: 18 }} onClick={() => { setIsPro(true); closePaywall(); }}>
            START TRAINING 🥋
          </button>
        </div>
      );
    }

    // ── PROCESSING ──
    if (paywallStep === "processing") {
      return (
        <div style={{ ...S.app, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>⏳</div>
          <div style={{ fontSize: 22, letterSpacing: 3, color: C.pink, marginBottom: 10 }}>PROCESSING...</div>
          <div style={{ fontFamily: "Arial, sans-serif", fontSize: 14, color: C.gray }}>Securing your payment</div>
          <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: C.pink, opacity: 0.4 + i * 0.3 }} />)}
          </div>
        </div>
      );
    }

    // ── PAYMENT FORM ──
    if (paywallStep === "payment" || paywallStep === "trial") {
      const isTrial = paywallStep === "trial";
      const plan = plans.find(p => p.id === selPlan);
      return (
        <div style={{ ...S.app, overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
            <button onClick={() => setPaywallStep("plans")} style={S.backBtn}>←</button>
            <div style={{ fontSize: 16, letterSpacing: 3 }}>{isTrial ? "🎁 START FREE TRIAL" : "💳 PAYMENT"}</div>
          </div>

          <div style={{ padding: "16px 20px" }}>
            {/* Order summary */}
            <div style={{ background: isTrial ? `${C.green}15` : `${C.pink}15`, border: `1px solid ${isTrial ? C.green : C.pink}44`, borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, letterSpacing: 1, color: C.white }}>
                    {isTrial ? "7-Day Free Trial" : `MMA Manual Pro — ${plan.label}`}
                  </div>
                  <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: isTrial ? C.green : C.gray, marginTop: 3 }}>
                    {isTrial ? `Then ${plan.price}${plan.period} — cancel anytime` : plan.sub}
                  </div>
                </div>
                <div style={{ fontSize: 22, color: isTrial ? C.green : C.white }}>{isTrial ? "FREE" : plan.price}</div>
              </div>
            </div>

            {isTrial && (
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontFamily: "Arial, sans-serif", fontSize: 12, color: C.gray, lineHeight: 1.7 }}>
                💡 We collect your card now to start your trial seamlessly. <strong style={{ color: C.white }}>You won't be charged until {new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString('en-US',{month:'long',day:'numeric'})}</strong>. Cancel anytime before then.
              </div>
            )}

            {/* Card form */}
            <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 14 }}>CARD DETAILS</div>

            {/* Name */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, marginBottom: 6 }}>NAME ON CARD</div>
              <input
                style={{ ...S.input, background: "rgba(255,255,255,0.06)", color: C.white, border: `1px solid ${cardErrors.name ? "#FF4444" : C.border}`, marginBottom: 0 }}
                placeholder="John Smith"
                value={cardForm.name}
                onChange={e => setCardForm({ ...cardForm, name: e.target.value })}
              />
              {cardErrors.name && <div style={{ fontSize: 11, color: "#FF4444", fontFamily: "Arial, sans-serif", marginTop: 4 }}>{cardErrors.name}</div>}
            </div>

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, marginBottom: 6 }}>EMAIL</div>
              <input
                style={{ ...S.input, background: "rgba(255,255,255,0.06)", color: C.white, border: `1px solid ${cardErrors.email ? "#FF4444" : C.border}`, marginBottom: 0 }}
                placeholder="you@example.com"
                value={cardForm.email}
                inputMode="email"
                onChange={e => setCardForm({ ...cardForm, email: e.target.value })}
              />
              {cardErrors.email && <div style={{ fontSize: 11, color: "#FF4444", fontFamily: "Arial, sans-serif", marginTop: 4 }}>{cardErrors.email}</div>}
            </div>

            {/* Card number */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, marginBottom: 6 }}>CARD NUMBER</div>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...S.input, background: "rgba(255,255,255,0.06)", color: C.white, border: `1px solid ${cardErrors.number ? "#FF4444" : C.border}`, marginBottom: 0, paddingRight: 48 }}
                  placeholder="1234 5678 9012 3456"
                  value={cardForm.number}
                  onChange={e => setCardForm({ ...cardForm, number: formatCard(e.target.value) })}
                  maxLength={19}
                  inputMode="numeric"
                />
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 20 }}>
                  {cardForm.number.startsWith("4") ? "💳" : cardForm.number.startsWith("5") ? "💳" : "💳"}
                </span>
              </div>
              {cardErrors.number && <div style={{ fontSize: 11, color: "#FF4444", fontFamily: "Arial, sans-serif", marginTop: 4 }}>{cardErrors.number}</div>}
            </div>

            {/* Expiry + CVV */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, marginBottom: 6 }}>EXPIRY</div>
                <input
                  style={{ ...S.input, background: "rgba(255,255,255,0.06)", color: C.white, border: `1px solid ${cardErrors.expiry ? "#FF4444" : C.border}`, marginBottom: 0 }}
                  placeholder="MM/YY"
                  value={cardForm.expiry}
                  onChange={e => setCardForm({ ...cardForm, expiry: formatExpiry(e.target.value) })}
                  maxLength={5}
                  inputMode="numeric"
                />
                {cardErrors.expiry && <div style={{ fontSize: 10, color: "#FF4444", fontFamily: "Arial, sans-serif", marginTop: 4 }}>{cardErrors.expiry}</div>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, marginBottom: 6 }}>CVV</div>
                <input
                  style={{ ...S.input, background: "rgba(255,255,255,0.06)", color: C.white, border: `1px solid ${cardErrors.cvv ? "#FF4444" : C.border}`, marginBottom: 0 }}
                  placeholder="123"
                  value={cardForm.cvv}
                  onChange={e => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g,"").slice(0,4) })}
                  maxLength={4}
                  inputMode="numeric"
                />
                {cardErrors.cvv && <div style={{ fontSize: 10, color: "#FF4444", fontFamily: "Arial, sans-serif", marginTop: 4 }}>{cardErrors.cvv}</div>}
              </div>
            </div>

            <button
              style={{ ...S.btnPink, fontSize: 18, padding: "18px", background: isTrial ? `linear-gradient(135deg,${C.green},#009944)` : `linear-gradient(135deg,${C.pink},#C00090)` }}
              onClick={isTrial ? handleStartTrial : handleSubscribe}
            >
              {isTrial ? "🎁 START FREE TRIAL" : `🔒 PAY ${plan.price} — UNLOCK PRO`}
            </button>

            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 14 }}>
              <span style={{ fontSize: 14 }}>🔒</span>
              <span style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray }}>256-bit SSL encrypted · Powered by Stripe</span>
            </div>
          </div>
        </div>
      );
    }

    // ── PLAN SELECTION (default) ──
    return (
      <div style={{ ...S.app, background: `radial-gradient(ellipse at 50% 0%,rgba(255,20,147,0.2) 0%,transparent 60%),#0A0A0A`, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 20px" }}>
          <button onClick={closePaywall} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 36, height: 36, color: C.white, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ textAlign: "center", padding: "0 24px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🥋</div>
          <div style={{ fontSize: 34, letterSpacing: 4, background: `linear-gradient(135deg,${C.pink},${C.cyan})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>GO PRO</div>
          <div style={{ fontSize: 14, fontFamily: "Arial, sans-serif", color: "rgba(255,255,255,0.7)", marginTop: 8, lineHeight: 1.6 }}>Unlock every technique, coaching tool & community feature.</div>
        </div>

        {/* Free trial banner */}
        <div style={{ margin: "0 20px 16px", background: `linear-gradient(135deg,${C.green}22,${C.green}08)`, border: `1px solid ${C.green}44`, borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 28 }}>🎁</div>
          <div>
            <div style={{ fontSize: 16, letterSpacing: 2, color: C.green }}>7-DAY FREE TRIAL</div>
            <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 2 }}>Full Pro access · No charge for 7 days · Cancel anytime</div>
          </div>
        </div>

        {/* Features list */}
        <div style={{ margin: "0 20px 20px", background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          {[["✅","Unlimited video access — all techniques"],["✅","Full coaching hub — playlists, notes & tags"],["✅","Group chats & direct messages"],["✅","Unlimited club access"],["✅","Upload moves & earn from bounties"],["🔒","Free: 5 videos/section · Upgrade to unlock all"]].map(([icon, text], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", borderBottom: i < 5 ? `1px solid ${C.border}` : "none", background: i === 5 ? "rgba(255,255,255,0.02)" : "transparent" }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontFamily: "Arial, sans-serif", fontSize: 13, color: i === 5 ? C.gray : C.white }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Plan picker */}
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{ fontSize: 12, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 12 }}>CHOOSE YOUR PLAN</div>
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            {plans.map(plan => (
              <div key={plan.id} onClick={() => setSelPlan(plan.id)} style={{ flex: 1, background: selPlan === plan.id ? `linear-gradient(135deg,${C.pink}22,${C.cyan}11)` : C.card, border: `2px solid ${selPlan === plan.id ? C.pink : C.border}`, borderRadius: 16, padding: "18px 10px", textAlign: "center", cursor: "pointer", position: "relative" }}>
                {plan.badge && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: `linear-gradient(135deg,${C.gold},#CC8800)`, borderRadius: 20, padding: "3px 10px", fontSize: 9, color: "#000", fontFamily: "Arial, sans-serif", fontWeight: "bold", whiteSpace: "nowrap" }}>{plan.badge}</div>}
                {plan.savings && <div style={{ position: "absolute", top: -10, right: 8, background: C.green, borderRadius: 20, padding: "2px 8px", fontSize: 9, color: "#000", fontFamily: "Arial, sans-serif", fontWeight: "bold" }}>{plan.savings}</div>}
                <div style={{ fontSize: 11, letterSpacing: 3, color: selPlan === plan.id ? C.pink : C.gray, marginBottom: 6 }}>{plan.label}</div>
                <div style={{ fontSize: 28, color: C.white }}>{plan.price}</div>
                <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray }}>{plan.period}</div>
                <div style={{ fontSize: 10, fontFamily: "Arial, sans-serif", color: plan.id === "annual" ? C.green : C.gray, marginTop: 4 }}>{plan.sub}</div>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <button style={{ ...S.btnPink, background: `linear-gradient(135deg,${C.green},#009944)`, fontSize: 18, marginBottom: 12 }} onClick={() => setPaywallStep("trial")}>
            🎁 START FREE 7-DAY TRIAL
          </button>
          <button style={{ ...S.btnPink, background: "rgba(255,255,255,0.08)", border: `1px solid ${C.border}`, color: C.gray, fontSize: 14 }} onClick={() => setPaywallStep("payment")}>
            Skip trial — subscribe now {selPlan === "monthly" ? "($1.99/mo)" : "($19.99/yr)"}
          </button>
          <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray }}>🔒 Secure payment · Cancel anytime · Powered by Stripe</div>
        </div>
      </div>
    );
  }

  // ── VIDEO LIST (deepest level) ────────────────────────────────
  if (selSection && selSide && selDiscipline && selCategory) {
    const disc   = DISCIPLINES[selCategory].subs.find(s => s.id === selDiscipline);
    const vids   = (videos[selDiscipline]?.[selSide]?.[selSection]) || [];
    const color  = disc?.color || C.pink;
    return (
      <div style={S.app}>
        <div style={{ ...S.pageHdr, background: `linear-gradient(135deg,${color}22,#111)` }}>
          <button style={S.backBtn} onClick={() => { setSelSection(null); setSectionSearchQ(""); setHighlightVidIdx(null); }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, letterSpacing: 3, color }}>{selSection.toUpperCase()}</div>
            <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray }}>{disc?.name} · {selSide.toUpperCase()}</div>
          </div>
          <div style={{ fontSize: 26 }}>{disc?.icon}</div>
        </div>

        {/* Upload / Request row */}
        <div style={{ display: "flex", gap: 10, padding: "14px 20px 0" }}>
          <div onClick={() => setUploadModal(true)} style={{ flex: 1, border: `2px dashed ${C.cyan}66`, borderRadius: 12, padding: "12px", textAlign: "center", cursor: "pointer", color: C.cyan, fontSize: 13, letterSpacing: 2 }}>⬆ UPLOAD MOVE</div>
          <div onClick={() => setBountyModal(true)} style={{ flex: 1, border: `2px dashed ${C.gold}66`, borderRadius: 12, padding: "12px", textAlign: "center", cursor: "pointer", color: C.gold, fontSize: 13, letterSpacing: 2 }}>💰 REQUEST MOVE</div>
        </div>

        <div style={{ padding: "16px 20px" }}>
          {vids.length > 0 && (
            <SectionSearchBar
              vids={vids}
              query={sectionSearchQ}
              setQuery={setSectionSearchQ}
              color={color}
              isPro={isPro}
              freeCount={5}
              onPick={(i) => {
                setSectionSearchQ("");
                setHighlightVidIdx(i);
                requestAnimationFrame(() => {
                  document.getElementById(`vid-card-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                });
                setTimeout(() => setHighlightVidIdx(null), 2200);
              }}
            />
          )}
          {vids.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>🎬</div>
              <div style={{ fontSize: 20, letterSpacing: 3, marginBottom: 8 }}>COMING SOON</div>
              <div style={{ fontSize: 13, fontFamily: "Arial, sans-serif", color: C.gray, lineHeight: 1.6 }}>Videos for this section are on their way. Request a move or upload your own!</div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {vids.map((v, i) => (
              <VideoCard
                key={i} v={v} index={i} isPro={isPro}
                cardId={`vid-card-${i}`}
                highlighted={highlightVidIdx === i}
                onLock={() => setShowPaywall(true)}
                onFav={() => toggleFav(v, selDiscipline, selSide, selSection)}
                isFav={isFav(v.title)}
              />
            ))}
          </div>
          {!isPro && vids.length > 5 && (
            <div onClick={() => setShowPaywall(true)} style={{ background: `linear-gradient(135deg,rgba(255,20,147,0.15),rgba(0,207,255,0.08))`, border: `1px solid ${C.pink}44`, borderRadius: 14, padding: "20px", textAlign: "center", cursor: "pointer", marginTop: 14 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
              <div style={{ fontSize: 18, letterSpacing: 3, marginBottom: 6 }}>{vids.length - 5} MORE VIDEOS</div>
              <div style={{ background: `linear-gradient(135deg,${C.pink},#C00090)`, borderRadius: 10, padding: "10px 20px", fontSize: 16, letterSpacing: 3, color: C.white, display: "inline-block" }}>UNLOCK — $1.99/mo</div>
            </div>
          )}
        </div>

        <div style={{ height: 80 }} />
        <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />

        {/* Upload modal */}
        {uploadModal && (
          <div style={S.modal}>
            <div style={S.modalBox}>
              <div style={{ fontSize: 22, letterSpacing: 3, marginBottom: 6 }}>⬆ UPLOAD A MOVE</div>
              <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: C.gray, marginBottom: 20 }}>Add a video to {selSection} · {selSide} · {disc?.name}</div>
              <input style={S.input} placeholder="Move Title" />
              <input style={S.input} placeholder="YouTube URL" />
              <div style={{ border: `2px dashed ${C.cyan}55`, borderRadius: 12, padding: "28px", textAlign: "center", marginBottom: 16, color: C.cyan, fontSize: 15, letterSpacing: 2, cursor: "pointer" }}>📹 OR SELECT VIDEO FILE</div>
              <button style={S.btnPink} onClick={() => setUploadModal(false)}>SUBMIT</button>
              <button style={S.btnCyan} onClick={() => setUploadModal(false)}>CANCEL</button>
            </div>
          </div>
        )}
        {/* Bounty request modal */}
        {bountyModal && (
          <div style={S.modal}>
            <div style={S.modalBox}>
              <div style={{ fontSize: 22, letterSpacing: 3, color: C.gold, marginBottom: 6 }}>💰 REQUEST A TECHNIQUE</div>
              <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: C.gray, marginBottom: 20 }}>Can't find a move? Request it. Creator earns $5 · Platform earns $5.</div>
              <input style={S.input} placeholder="Technique Name" value={bountyForm.move} onChange={e => setBountyForm({ ...bountyForm, move: e.target.value })} />
              <div style={{ background: `rgba(255,215,0,0.08)`, border: `1px solid ${C.gold}44`, borderRadius: 12, padding: "14px", marginBottom: 16 }}>
                <div style={{ fontSize: 12, letterSpacing: 3, color: C.gold, marginBottom: 10, fontFamily: "Arial, sans-serif" }}>PAYOUT BREAKDOWN</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {[["$10","You Pay",C.white],["$5","Creator Earns",C.green],["$5","Platform",C.gold]].map(([amt,lbl,col],i) => (
                    <div key={i} style={{ flex: 1, background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "10px 6px", textAlign: "center" }}>
                      <div style={{ fontSize: 20, color: col }}>{amt}</div>
                      <div style={{ fontSize: 9, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 2 }}>{lbl.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button style={{ ...S.btnPink, background: `linear-gradient(135deg,${C.gold},#CC8800)`, color: "#000" }} onClick={() => setBountyModal(false)}>SUBMIT REQUEST — PAY $10</button>
              <button style={S.btnCyan} onClick={() => setBountyModal(false)}>CANCEL</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── OFFENSE / DEFENSE PICKER ──────────────────────────────────
  if (selSide && selDiscipline && selCategory) {
    const disc  = DISCIPLINES[selCategory].subs.find(s => s.id === selDiscipline);
    const secs  = SECTIONS[selDiscipline]?.[selSide] || [];
    const color = disc?.color || C.pink;
    return (
      <div style={S.app}>
        <div style={{ ...S.pageHdr, background: `linear-gradient(135deg,${color}22,#111)` }}>
          <button style={S.backBtn} onClick={() => setSelSide(null)}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, letterSpacing: 3, color }}>{selSide === "offense" ? "⚔️ OFFENSE" : "🛡️ DEFENSE"}</div>
            <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray }}>{disc?.name}</div>
          </div>
          <div style={{ fontSize: 26 }}>{disc?.icon}</div>
        </div>
        <div style={{ padding: "20px" }}>
          <div style={{ fontSize: 12, letterSpacing: 4, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 16 }}>SELECT SECTION</div>
          {secs.map(sec => {
            const count = (videos[selDiscipline]?.[selSide]?.[sec] || []).length;
            return (
              <PickerCard key={sec} icon={selSide === "offense" ? "🎯" : "🛡️"} name={sec} sub={null} count={count} color={color} onClick={() => { setSelSection(sec); setSectionSearchQ(""); setHighlightVidIdx(null); }} />
            );
          })}
        </div>
        <div style={{ height: 80 }} />
        <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
      </div>
    );
  }

  // ── OFFENSE / DEFENSE CHOOSER ─────────────────────────────────
  if (selDiscipline && selCategory) {
    const disc  = DISCIPLINES[selCategory].subs.find(s => s.id === selDiscipline);
    const color = disc?.color || C.pink;
    const offTotal = Object.values(videos[selDiscipline]?.offense || {}).reduce((a, v) => a + v.length, 0);
    const defTotal = Object.values(videos[selDiscipline]?.defense || {}).reduce((a, v) => a + v.length, 0);
    const isBestMMA = selCategory === "bestmma";
    const isDrills  = selCategory === "drills";
    const isUFCFighters = selDiscipline === "ufc_fighters" || selDiscipline === "bjj_fighters" || selDiscipline === "boxing_fighters";

    // ── UFC/BJJ/BOXING FIGHTERS — special fighter profile card picker ──
    if (isUFCFighters && !selDrillCat) {
      const fighters = Object.keys(videos[selDiscipline]?.offense || {});
      const fighterMeta = {
        "Justin Gaethje":   { nickname: "The Highlight",   weight: "Lightweight",   flag: "🇺🇸", record: "28-5", belt: "🏆 Former UFC LW Champ", color: "#CC0000" },
        "Dustin Poirier":   { nickname: "The Diamond",     weight: "Lightweight",   flag: "🇺🇸", record: "30-9", belt: "",                      color: "#CC0000" },
        "Luke Rockhold":    { nickname: "Cool Hand Luke",  weight: "Middleweight",  flag: "🇺🇸", record: "16-5", belt: "🏆 Former UFC MW Champ", color: "#CC0000" },
        "Daniel Cormier":   { nickname: "DC",              weight: "HW / LHW",      flag: "🇺🇸", record: "22-3", belt: "🏆 2x UFC Champ",        color: "#CC0000" },
        "Corey Sandhagen":  { nickname: "The Sandman",     weight: "Bantamweight",  flag: "🇺🇸", record: "18-5", belt: "",                      color: "#CC0000" },
        "Georges St-Pierre":{ nickname: "GSP",              weight: "Welterweight",  flag: "🇨🇦", record: "26-2", belt: "🏆 2x UFC Champ · GOAT",  color: "#CC0000" },
        "Craig Jones":      { nickname: "El Muchacho",     weight: "Middleweight",  flag: "🇦🇺", record: "10-1", belt: "🥋 BJJ Black Belt",      color: C.cyan },
        "John Danaher":     { nickname: "The Iceman",      weight: "Coach/Analyst", flag: "🇳🇿", record: "—",   belt: "🥋 Elite Grappling Coach",color: C.cyan },
        "Terrance Crawford":{ nickname: "Bud",             weight: "Welterweight",  flag: "🇺🇸", record: "40-0", belt: "🥊 Undisputed WW Champ", color: C.pink },
      };
      const catLabel = selDiscipline === "ufc_fighters" ? "UFC FIGHTERS" : selDiscipline === "bjj_fighters" ? "BJJ FIGHTERS" : "BOXERS";
      const catColor2 = selDiscipline === "ufc_fighters" ? "#CC0000" : selDiscipline === "bjj_fighters" ? C.cyan : C.pink;
      return (
        <div style={S.app}>
          <div style={{ ...S.pageHdr, background: `linear-gradient(135deg,rgba(204,0,0,0.3),#111)` }}>
            <button style={S.backBtn} onClick={() => { setSelDiscipline(null); setSectionSearchQ(""); setHighlightVidIdx(null); setSelDrillCat(null); }}>←</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, letterSpacing: 3, color: catColor2 }}>{catLabel}</div>
              <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray }}>UFC & BJJ FIGHTERS · {fighters.reduce((a, f) => a + (videos[selDiscipline]?.offense?.[f]?.length || 0), 0)} VIDEOS</div>
            </div>
            <div style={{ fontSize: 30 }}>🌟</div>
          </div>
          <div style={{ padding: "16px" }}>
            <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, letterSpacing: 2, marginBottom: 14 }}>SELECT A FIGHTER</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {fighters.map(fighter => {
                const meta = fighterMeta[fighter] || { nickname: "", weight: "", flag: "🥊", record: "", belt: "", color: "#CC0000" };
                const vids = videos[selDiscipline]?.offense?.[fighter] || [];
                const thumb = vids[0]?.youtubeUrl ? getYTThumb(vids[0].youtubeUrl) : null;
                const fColor = meta.color || "#CC0000";
                return (
                  <div key={fighter} onClick={() => { setSelDrillCat(fighter); setSectionSearchQ(""); setHighlightVidIdx(null); }} style={{ background: C.card, border: `1px solid ${fColor}44`, borderRadius: 14, overflow: "hidden", cursor: "pointer" }}>
                    {/* Fighter photo / thumbnail */}
                    <div style={{ height: 110, background: thumb ? `url(${thumb}) center/cover no-repeat` : `linear-gradient(135deg,${fColor}44,#111)`, position: "relative", display: "flex", alignItems: "flex-end" }}>
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.85))" }} />
                      <div style={{ position: "relative", zIndex: 1, padding: "0 10px 8px", width: "100%", boxSizing: "border-box" }}>
                        <div style={{ fontSize: 9, fontFamily: "Arial, sans-serif", color: fColor, letterSpacing: 1 }}>{meta.weight.toUpperCase()}</div>
                        {meta.belt && <div style={{ fontSize: 9, fontFamily: "Arial, sans-serif", color: C.gold }}>{meta.belt}</div>}
                      </div>
                      <div style={{ position: "absolute", top: 8, right: 8, fontSize: 16 }}>{meta.flag}</div>
                    </div>
                    {/* Fighter info */}
                    <div style={{ padding: "10px 10px 12px" }}>
                      <div style={{ fontSize: 13, letterSpacing: 0.5, lineHeight: 1.2, color: C.white }}>{fighter}</div>
                      {meta.nickname && <div style={{ fontSize: 10, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 2 }}>"{meta.nickname}"</div>}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                        <div style={{ fontSize: 10, fontFamily: "Arial, sans-serif", color: fColor }}>{meta.record}</div>
                        <div style={{ background: `${fColor}22`, borderRadius: 10, padding: "2px 8px", fontSize: 10, fontFamily: "Arial, sans-serif", color: fColor }}>{vids.length} video{vids.length !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ height: 80 }} />
          <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
        </div>
      );
    }

    // If bestmma, drills, or ufc_fighters (with fighter selected), skip offense/defense chooser
    if (isBestMMA || isDrills || (isUFCFighters && selDrillCat)) {
      const drillBuckets = isDrills ? Object.keys(videos[selDiscipline]?.offense || {}) : isUFCFighters ? Object.keys(videos[selDiscipline]?.offense || {}) : ["Videos"];
      const needsDrillCatPicker = isDrills && drillBuckets.length > 1 && !selDrillCat;
      const activeBucket = (isDrills || isUFCFighters) ? (selDrillCat || drillBuckets[0]) : "Videos";
      const vids = videos[selDiscipline]?.offense?.[activeBucket] || [];
      const color = isUFCFighters ? (selDiscipline === "ufc_fighters" ? "#CC0000" : selDiscipline === "bjj_fighters" ? C.cyan : C.pink) : disc?.color || (isDrills ? "#9B5CFF" : C.gold);
      const eyebrow = isDrills ? "DRILLS" : isUFCFighters ? "UFC & BJJ FIGHTERS" : "MMA TECHNIQUES";
      const addLabel = isDrills ? "+ ADD A DRILL VIDEO" : "+ ADD VIDEO TO THIS SECTION";
      const emptyMsg = isDrills ? "No drills uploaded here yet. Coaches and users can add drill videos to assign to students and friends!" : "Videos coming to this section soon!";

      // ── Sub-category picker (only for Drills disciplines with more than one named bucket) ──
      if (needsDrillCatPicker) {
        return (
          <div style={S.app}>
            <div style={{ ...S.pageHdr, background: `linear-gradient(135deg,${color}33,#111)` }}>
              <button style={S.backBtn} onClick={() => { setSelDiscipline(null); setSectionSearchQ(""); setHighlightVidIdx(null); setSelDrillCat(null); }}>←</button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 22, letterSpacing: 3, color }}>{disc?.name}</div>
                <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray }}>{eyebrow}</div>
              </div>
              <div style={{ fontSize: 30 }}>{disc?.icon}</div>
            </div>
            <div style={{ padding: "20px" }}>
              {drillBuckets.map(bucket => {
                const count = (videos[selDiscipline]?.offense?.[bucket] || []).length;
                return (
                  <PickerCard key={bucket} icon="🧩" name={bucket} sub={`${count} video${count !== 1 ? "s" : ""}`} count={undefined} color={color} onClick={() => { setSelDrillCat(bucket); setSectionSearchQ(""); setHighlightVidIdx(null); }} />
                );
              })}
            </div>
            <div style={{ height: 80 }} />
            <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
          </div>
        );
      }

      return (
        <div style={S.app}>
          <div style={{ ...S.pageHdr, background: `linear-gradient(135deg,${color}33,#111)` }}>
            <button style={S.backBtn} onClick={() => {
              if (isDrills && selDrillCat) { setSelDrillCat(null); setSectionSearchQ(""); setHighlightVidIdx(null); }
              else { setSelDiscipline(null); setSectionSearchQ(""); setHighlightVidIdx(null); }
            }}>←</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, letterSpacing: 3, color }}>{isDrills ? activeBucket : disc?.name}</div>
              <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray }}>{isDrills ? disc?.name : eyebrow}</div>
            </div>
            <div style={{ fontSize: 30 }}>{disc?.icon}</div>
          </div>
          <div style={{ padding: "14px 20px 0" }}>
            <div onClick={() => setUploadModal(true)} style={{ border: `2px dashed ${color}66`, borderRadius: 12, padding: "12px", textAlign: "center", cursor: "pointer", color, fontSize: 13, letterSpacing: 2, marginBottom: 16 }}>{addLabel}</div>
          </div>
          <div style={{ padding: "0 20px" }}>
            {vids.length > 0 && (
              <SectionSearchBar
                vids={vids}
                query={sectionSearchQ}
                setQuery={setSectionSearchQ}
                color={color}
                isPro={isPro}
                freeCount={5}
                onPick={(i) => {
                  setSectionSearchQ("");
                  setHighlightVidIdx(i);
                  requestAnimationFrame(() => {
                    document.getElementById(`vid-card-flat-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  });
                  setTimeout(() => setHighlightVidIdx(null), 2200);
                }}
              />
            )}
            {vids.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 14 }}>{isDrills ? "🧩" : "🎬"}</div>
                <div style={{ fontSize: 20, letterSpacing: 3, marginBottom: 8 }}>COMING SOON</div>
                <div style={{ fontSize: 13, fontFamily: "Arial, sans-serif", color: C.gray }}>{emptyMsg}</div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {vids.map((v, i) => (
                <VideoCard
                  key={i} v={v} index={i} isPro={isPro}
                  cardId={`vid-card-flat-${i}`}
                  highlighted={highlightVidIdx === i}
                  onLock={() => setShowPaywall(true)}
                  onFav={() => toggleFav(v, selDiscipline, "offense", activeBucket)}
                  isFav={isFav(v.title)}
                />
              ))}
            </div>
            {!isPro && vids.length > 5 && (
              <div onClick={() => setShowPaywall(true)} style={{ background: `linear-gradient(135deg,rgba(255,20,147,0.15),rgba(0,207,255,0.08))`, border: `1px solid ${C.pink}44`, borderRadius: 14, padding: "20px", textAlign: "center", cursor: "pointer", marginTop: 14 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
                <div style={{ fontSize: 18, letterSpacing: 3, marginBottom: 6 }}>{vids.length - 5} MORE VIDEOS</div>
                <div style={{ background: `linear-gradient(135deg,${color},${color}aa)`, borderRadius: 10, padding: "10px 20px", fontSize: 16, letterSpacing: 3, color: C.white, display: "inline-block" }}>UNLOCK — $1.99/mo</div>
              </div>
            )}
          </div>
          <div style={{ height: 80 }} />
          <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
        </div>
      );
    }

    return (
      <div style={S.app}>
        <div style={{ ...S.pageHdr, background: `linear-gradient(135deg,${color}33,#111)` }}>
          <button style={S.backBtn} onClick={() => { setSelDiscipline(null); setSectionSearchQ(""); setHighlightVidIdx(null); setSelDrillCat(null); }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26, letterSpacing: 3, color }}>{disc?.name}</div>
            <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray }}>SELECT CATEGORY</div>
          </div>
          <div style={{ fontSize: 32 }}>{disc?.icon}</div>
        </div>
        <div style={{ padding: "20px" }}>
          <PickerCard icon="⚔️" name="OFFENSE" sub="Attacks, combos & finishing" count={offTotal} color={color} onClick={() => setSelSide("offense")} />
          <PickerCard icon="🛡️" name="DEFENSE" sub="Guards, counters & escapes"  count={defTotal} color={color} onClick={() => setSelSide("defense")} />
        </div>
        <div style={{ height: 80 }} />
        <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
      </div>
    );
  }

  // ── DISCIPLINE PICKER ─────────────────────────────────────────
  if (selCategory) {
    const cat   = DISCIPLINES[selCategory];
    const color = cat.color;
    const isFlatCat = selCategory === "bestmma" || selCategory === "drills" || selCategory === "fighters";
    return (
      <div style={S.app}>
        <div style={{ ...S.pageHdr, background: `linear-gradient(135deg,${color}33,#111)` }}>
          <button style={S.backBtn} onClick={() => setSelCategory(null)}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26, letterSpacing: 3, color }}>{cat.label}</div>
            <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray }}>SELECT CATEGORY</div>
          </div>
          <div style={{ fontSize: 32 }}>{cat.icon}</div>
        </div>
        <div style={{ padding: "20px" }}>
          {cat.subs.map(sub => {
            const total = Object.values(videos[sub.id] || {}).reduce((a, sides) => a + Object.values(sides).reduce((b, vids) => b + vids.length, 0), 0);
            return (
              <PickerCard key={sub.id} icon={sub.icon} name={sub.name} sub={isFlatCat ? `${total} videos` : "Offense & Defense"} count={isFlatCat ? undefined : total} color={color} onClick={() => { setSelDiscipline(sub.id); setSectionSearchQ(""); setHighlightVidIdx(null); setSelDrillCat(null); }} />
            );
          })}
        </div>
        <div style={{ height: 80 }} />
        <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
      </div>
    );
  }

  // ── COMMUNITY TAB ─────────────────────────────────────────────
  if (activeTab === "community") {

    const UFC329_FIGHTS = [
      { id:1, order:"MAIN EVENT", weight:"170 lbs / Welterweight", card:"main",
        f1:{ name:"Conor McGregor", nickname:"The Notorious", record:"22-6", country:"🇮🇪", flag:"🇮🇪", height:'5\'9"', weight_lbs:"170", reach:'74"', stance:"Southpaw", odds:"+240" },
        f2:{ name:"Max Holloway",   nickname:"Blessed",       record:"27-9", country:"🇺🇸", flag:"🇺🇸", height:'5\'11"', weight_lbs:"170", reach:'69"', stance:"Orthodox", odds:"-298" } },
      { id:2, order:"CO-MAIN", weight:"155 lbs / Lightweight", card:"main",
        f1:{ name:"Paddy Pimblett", nickname:"The Baddy",    record:"23-4", country:"🇬🇧", flag:"🇬🇧", height:'5\'10"', weight_lbs:"155", reach:'73"', stance:"Orthodox", odds:"+127" },
        f2:{ name:"B. Saint Denis", nickname:"God of War",   record:"17-3", country:"🇫🇷", flag:"🇫🇷", height:'5\'11"', weight_lbs:"155", reach:'72"', stance:"Orthodox", odds:"-133" } },
      { id:3, order:"MAIN CARD", weight:"135 lbs / Bantamweight", card:"main",
        f1:{ name:"Cory Sandhagen", nickname:"The Sandman",  record:"18-6", country:"🇺🇸", flag:"🇺🇸", height:'5\'11"', weight_lbs:"135", reach:'70"', stance:"Orthodox", odds:"-130" },
        f2:{ name:"Mario Bautista", nickname:"El Matador",   record:"17-3", country:"🇺🇸", flag:"🇺🇸", height:'5\'8"', weight_lbs:"135", reach:'70"', stance:"Orthodox", odds:"+110" } },
      { id:4, order:"MAIN CARD", weight:"125 lbs / Flyweight", card:"main",
        f1:{ name:"Brandon Royval", nickname:"Raw Dawg",     record:"17-9", country:"🇺🇸", flag:"🇺🇸", height:'5\'6"', weight_lbs:"125", reach:'66"', stance:"Orthodox", odds:"-280" },
        f2:{ name:"Lone\'er Kavanagh", nickname:"—",        record:"11-1", country:"🇬🇧", flag:"🇬🇧", height:'5\'6"', weight_lbs:"125", reach:'66"', stance:"Orthodox", odds:"+225" } },
      { id:5, order:"MAIN CARD", weight:"155 lbs / Lightweight", card:"main",
        f1:{ name:"King Green",      nickname:"King",        record:"35-15", country:"🇺🇸", flag:"🇺🇸", height:'6\'0"', weight_lbs:"155", reach:'75"', stance:"Orthodox", odds:"+165" },
        f2:{ name:"T. McKinney",     nickname:"Hardbody",    record:"16-7", country:"🇺🇸", flag:"🇺🇸", height:'5\'11"', weight_lbs:"155", reach:'74"', stance:"Orthodox", odds:"-200" } },
      { id:6, order:"PRELIM", weight:"205 lbs / Light Heavyweight", card:"prelim",
        f1:{ name:"Robert Whittaker", nickname:"The Reaper", record:"26-8", country:"🇦🇺", flag:"🇦🇺", height:'6\'0"', weight_lbs:"205", reach:'73.5"', stance:"Orthodox", odds:"-180" },
        f2:{ name:"Nikita Krylov",   nickname:"The Miner",   record:"31-9", country:"🇺🇦", flag:"🇺🇦", height:'6\'3"', weight_lbs:"205", reach:'77"', stance:"Orthodox", odds:"+150" } },
      { id:7, order:"PRELIM", weight:"265 lbs / Heavyweight", card:"prelim",
        f1:{ name:"Gable Steveson",  nickname:"—",           record:"3-0",  country:"🇺🇸", flag:"🇺🇸", height:'5\'10"', weight_lbs:"265", reach:'72"', stance:"Orthodox", odds:"-250" },
        f2:{ name:"Elisha Ellison",  nickname:"The Snack Panther", record:"11-3", country:"🇺🇸", flag:"🇺🇸", height:'6\'1"', weight_lbs:"265", reach:'76"', stance:"Orthodox", odds:"+200" } },
      { id:8, order:"PRELIM", weight:"135 lbs / Bantamweight", card:"prelim",
        f1:{ name:"Cody Garbrandt",  nickname:"No Love",     record:"13-6", country:"🇺🇸", flag:"🇺🇸", height:'5\'7"', weight_lbs:"135", reach:'66"', stance:"Orthodox", odds:"+140" },
        f2:{ name:"Adrian Yanez",    nickname:"—",           record:"18-5", country:"🇺🇸", flag:"🇺🇸", height:'5\'8"', weight_lbs:"135", reach:'68"', stance:"Orthodox", odds:"-165" } },
    ];

    const HUB_GROUPS = [
      { id:"main",       name:"🏟️ MMA Hub Discussion",   desc:"The main discussion room — talk anything MMA", color:"#CC0000", pinned:true },
      { id:"ufc329",     name:"🥊 UFC 329 McGregor vs Holloway 2", desc:"Official event discussion — July 11, 2026", color:"#CC0000", pinned:true },
      { id:"mma_bets",   name:"💰 MMA Hub Bets",          desc:"Place your TMM bets & discuss the action",    color:"#9B5CFF", pinned:true },
      { id:"mma_odds",   name:"📊 MMA Odds",               desc:"Live odds, analysis & DraftKings picks",      color:C.gold,    pinned:true },
      { id:"mma",        name:"⚡ MMA",                    desc:"General MMA talk",         color:"#CC0000", pinned:false },
      { id:"bjj",        name:"🥋 BJJ",                    desc:"Brazilian Jiu-Jitsu discussion", color:C.cyan, pinned:false },
      { id:"boxing",     name:"🥊 Boxing",                 desc:"All things boxing",        color:C.pink,    pinned:false },
      { id:"kickboxing", name:"🦵 Kickboxing",             desc:"Kickboxing & K-1",         color:C.pink,    pinned:false },
      { id:"muaythai",   name:"🏆 Muay Thai",             desc:"Muay Thai discussion",     color:C.pink,    pinned:false },
      { id:"judo",       name:"🎯 Judo",                   desc:"Judo techniques & news",   color:C.cyan,    pinned:false },
      { id:"wrestling",  name:"💪 Wrestling",              desc:"Wrestling discussion",      color:C.cyan,    pinned:false },
    ];

    const QUICK_EMOJIS = ["👊","🔥","💯","😂","🤔","👀","🏆","💪","🥋","❤️","😮","👎"];

    const sendHubMsg = async (isPoll = false, pollData = null) => {
      if (!activeHubGroup) return;
      if (!isPoll && !hubMsgInput.trim()) return;
      const newMsg = isPoll ? {
        author: user.name, avatar: user.name[0].toUpperCase(), ts: Date.now(), time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
        type: "poll", question: pollData.question,
        options: pollData.options.filter(o => o.trim()).map(o => ({ text: o, votes: {}, count: 0 })),
        reactions: {}
      } : {
        author: user.name, avatar: user.name[0].toUpperCase(), ts: Date.now(), time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
        text: hubMsgInput.trim(), replyTo: hubReplyTo || null, reactions: {}, type: "text"
      };
      await fbPush(`hub_messages/${activeHubGroup}`, newMsg);
      setHubMsgInput("");
      setHubReplyTo(null);
    };

    const addReaction = async (msgIdx, emoji) => {
      const msgs = hubMessages[activeHubGroup] || [];
      const msg = msgs[msgIdx];
      if (!msg?._key) return;
      const reactions = { ...(msg.reactions || {}) };
      const users = { ...(reactions[emoji] || {}) };
      if (users[user.name]) delete users[user.name];
      else users[user.name] = true;
      if (Object.keys(users).length === 0) delete reactions[emoji];
      else reactions[emoji] = users;
      await fbPatch(`hub_messages/${activeHubGroup}/${msg._key}`, { reactions });
      setShowEmojiPicker(null);
    };

    const addThumb = (msgIdx, type) => addReaction(msgIdx, type === "up" ? "👍" : "👎");

    const votePoll = async (msgIdx, optIdx) => {
      const msgs = hubMessages[activeHubGroup] || [];
      const msg = msgs[msgIdx];
      if (!msg?._key || msg.type !== "poll") return;
      const options = msg.options.map((opt, i) => {
        const votes = { ...(opt.votes || {}) };
        delete votes[user.name]; // remove from all first
        return { ...opt, votes };
      });
      // Add vote to selected
      const selectedVotes = { ...(options[optIdx].votes || {}) };
      if (!(msg.options[optIdx].votes || {})[user.name]) {
        selectedVotes[user.name] = true;
      }
      options[optIdx] = { ...options[optIdx], votes: selectedVotes };
      await fbPatch(`hub_messages/${activeHubGroup}/${msg._key}`, { options });
    };

    const submitPoll = () => {
      const opts = pollForm.options.filter(o => o.trim());
      if (!pollForm.question.trim() || opts.length < 2) return;
      sendHubMsg(true, { question: pollForm.question, options: opts });
      setPollModal(false);
      setPollForm({ question: "", options: ["", ""] });
    };

    const isOddsOrBets = activeHubGroup === "mma_odds" || activeHubGroup === "mma_bets";

    // ── ACTIVE GROUP CHAT ──
    if (activeHubGroup) {
      const group = HUB_GROUPS.find(g => g.id === activeHubGroup);
      const messages = hubMessages[activeHubGroup] || [];
      return (
        <div style={{ ...S.app, display:"flex", flexDirection:"column" }} onClick={() => { setShowEmojiPicker(null); setShowMsgOptions(null); }}>
          <div style={{ ...S.header, borderBottomColor: group?.color || C.pink }}>
            <button style={S.backBtn} onClick={() => { setActiveHubGroup(null); setHubReplyTo(null); }}>←</button>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, letterSpacing:2 }}>{group?.name}</div>
              <div style={{ fontSize:10, fontFamily:"Arial, sans-serif", color:C.gray }}>{messages.length} messages</div>
            </div>
            <button onClick={e => { e.stopPropagation(); setPollModal(true); }} style={{ background:`${C.gold}22`, border:`1px solid ${C.gold}44`, borderRadius:20, padding:"6px 12px", fontSize:11, color:C.gold, cursor:"pointer", fontFamily:"Arial, sans-serif" }}>📊 POLL</button>
          </div>

          {/* Odds/Bets fight cards */}
          {isOddsOrBets && (
            <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}`, maxHeight:320, overflowY:"auto" }}>
              <div style={{ fontSize:10, fontFamily:"Arial, sans-serif", color:C.gold, letterSpacing:2, marginBottom:10 }}>
                UFC 329 · JULY 11, 2026 · {activeHubGroup === "mma_odds" ? "ODDS BY DRAFTKINGS" : "TMM TOKEN BETS"}
              </div>
              {UFC329_FIGHTS.map(fight => (
                <div key={fight.id} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`, borderRadius:12, padding:"12px", marginBottom:10 }}>
                  <div style={{ fontSize:9, fontFamily:"Arial, sans-serif", color:C.gold, letterSpacing:2, marginBottom:8, textAlign:"center" }}>{fight.order} · {fight.weight}</div>
                  <div style={{ display:"flex", gap:8 }}>
                    {[fight.f1, fight.f2].map((f, fi) => (
                      <div key={fi} style={{ flex:1, background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"10px 8px", textAlign:"center", border:`1px solid ${f.odds.startsWith("-") ? C.green+"44" : "#FF666644"}` }}>
                        <div style={{ fontSize:18, marginBottom:2 }}>{f.flag}</div>
                        <div style={{ fontSize:11, letterSpacing:0.5, lineHeight:1.2, color:C.white }}>{f.name}</div>
                        <div style={{ fontSize:9, fontFamily:"Arial, sans-serif", color:C.gray, marginTop:2 }}>"{f.nickname}"</div>
                        <div style={{ fontSize:14, fontFamily:"Arial, sans-serif", color:f.odds.startsWith("-") ? C.green : "#FF6666", fontWeight:"bold", marginTop:4 }}>{f.odds}</div>
                        <div style={{ marginTop:6, fontSize:9, fontFamily:"Arial, sans-serif", color:C.gray, lineHeight:1.6 }}>
                          📋 {f.record}<br/>📏 {f.height} · {f.weight_lbs}lbs<br/>🦾 {f.reach}<br/>🥊 {f.stance}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {activeHubGroup === "mma_odds" && (
                <div onClick={() => window.open("https://www.draftkings.com/sportsbook/mma","_blank")} style={{ background:"#1B5E2022", border:`1px solid #4CAF5055`, borderRadius:10, padding:"10px", textAlign:"center", cursor:"pointer" }}>
                  <div style={{ fontSize:12, fontFamily:"Arial, sans-serif", color:"#4CAF50", fontWeight:"bold" }}>🎰 BET ON DRAFTKINGS →</div>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div style={{ flex:1, padding:"12px 14px", overflowY:"auto" }}>
            {fbLoading && messages.length === 0 && (
              <div style={{ textAlign:"center", padding:"30px 0", fontFamily:"Arial, sans-serif", color:C.gray, fontSize:13 }}>
                Loading messages... ⏳
              </div>
            )}
            {!fbLoading && messages.length === 0 && (
              <div style={{ textAlign:"center", padding:"30px 0", fontFamily:"Arial, sans-serif", color:C.gray, fontSize:13 }}>
                No messages yet — start the conversation! 💬
              </div>
            )}
            {messages.map((m, i) => {
              const myReactions = Object.entries(m.reactions || {}).filter(([,users]) => users && users[user.name]).map(([e]) => e);
              const totalVotes = m.type === "poll" ? m.options.reduce((a,o) => a + Object.keys(o.votes || {}).length, 0) : 0;
              return (
                <div key={i} style={{ marginBottom:16 }}>
                  {/* Reply context */}
                  {m.replyTo && (
                    <div style={{ marginLeft:36, marginBottom:4, background:"rgba(255,255,255,0.04)", borderLeft:`2px solid ${C.gray}`, borderRadius:"0 8px 8px 0", padding:"4px 10px" }}>
                      <div style={{ fontSize:10, fontFamily:"Arial, sans-serif", color:C.gray }}>↩ replying to @{m.replyTo.author}: {m.replyTo.text?.slice(0,40)}{m.replyTo.text?.length > 40 ? "..." : ""}</div>
                    </div>
                  )}
                  {/* Author row */}
                  <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                    <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg,${group?.color || C.pink},${C.cyan})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 }}>{m.avatar}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                        <span style={{ fontFamily:"Arial, sans-serif", fontSize:12, color:group?.color || C.pink, fontWeight:"bold" }}>@{m.author}</span>
                        <span style={{ fontFamily:"Arial, sans-serif", fontSize:10, color:C.gray }}>{m.time}</span>
                      </div>

                      {/* Poll message */}
                      {m.type === "poll" ? (
                        <div style={{ background:"rgba(255,215,0,0.06)", border:`1px solid ${C.gold}33`, borderRadius:12, padding:"12px" }}>
                          <div style={{ fontSize:13, fontFamily:"Arial, sans-serif", color:C.white, marginBottom:10, fontWeight:"bold" }}>📊 {m.question}</div>
                          {m.options.map((opt, oi) => {
                            const pct = totalVotes > 0 ? Math.round(Object.keys(opt.votes || {}).length / totalVotes * 100) : 0;
                            const voted = (opt.votes || {})[user.name];
                            return (
                              <div key={oi} onClick={() => votePoll(i, oi)} style={{ marginBottom:8, cursor:"pointer" }}>
                                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                                  <span style={{ fontFamily:"Arial, sans-serif", fontSize:12, color:voted ? C.gold : C.white }}>{voted ? "✓ " : ""}{opt.text}</span>
                                  <span style={{ fontFamily:"Arial, sans-serif", fontSize:12, color:C.gray }}>{pct}% ({opt.votes?.length || 0})</span>
                                </div>
                                <div style={{ height:6, background:"rgba(255,255,255,0.08)", borderRadius:3, overflow:"hidden" }}>
                                  <div style={{ height:"100%", width:`${pct}%`, background:voted ? C.gold : C.gray, borderRadius:3, transition:"width 0.3s" }} />
                                </div>
                              </div>
                            );
                          })}
                          <div style={{ fontSize:10, fontFamily:"Arial, sans-serif", color:C.gray, marginTop:6 }}>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</div>
                        </div>
                      ) : (
                        <div style={{ fontFamily:"Arial, sans-serif", fontSize:13, color:"rgba(255,255,255,0.85)", lineHeight:1.5 }}>{m.text}</div>
                      )}

                      {/* Reaction bar */}
                      <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap", alignItems:"center" }}>
                        {/* Existing reactions */}
                        {Object.entries(m.reactions || {}).filter(([,u]) => u && Object.keys(u).length > 0).map(([emoji, users]) => (
                          <div key={emoji} onClick={() => addReaction(i, emoji)} style={{ background:users[user.name] ? `${C.gold}22` : "rgba(255,255,255,0.06)", border:`1px solid ${users[user.name] ? C.gold+"66" : C.border}`, borderRadius:20, padding:"3px 8px", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:3 }}>
                            {emoji}<span style={{ fontFamily:"Arial, sans-serif", fontSize:11, color:C.gray }}>{Object.keys(users).length}</span>
                          </div>
                        ))}
                        {/* Thumbs */}
                        <div onClick={() => addThumb(i, "up")} style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:20, padding:"3px 8px", fontSize:13, cursor:"pointer" }}>👍 {Object.keys(m.reactions?.["👍"] || {}).length || ""}</div>
                        <div onClick={() => addThumb(i, "down")} style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:20, padding:"3px 8px", fontSize:13, cursor:"pointer" }}>👎 {Object.keys(m.reactions?.["👎"] || {}).length || ""}</div>
                        {/* Emoji picker trigger */}
                        <div onClick={e => { e.stopPropagation(); setShowEmojiPicker(showEmojiPicker === i ? null : i); }} style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:20, padding:"3px 8px", fontSize:13, cursor:"pointer" }}>😀</div>
                        {/* Reply */}
                        <div onClick={() => setHubReplyTo({ msgIdx:i, author:m.author, text:m.text || m.question })} style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:20, padding:"3px 8px", fontSize:11, fontFamily:"Arial, sans-serif", color:C.gray, cursor:"pointer" }}>↩ Reply</div>
                      </div>

                      {/* Emoji picker */}
                      {showEmojiPicker === i && (
                        <div onClick={e => e.stopPropagation()} style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8, background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"10px" }}>
                          {QUICK_EMOJIS.map(emoji => (
                            <div key={emoji} onClick={() => addReaction(i, emoji)} style={{ fontSize:20, cursor:"pointer", padding:"4px", borderRadius:8, background:myReactions.includes(emoji) ? `${C.gold}22` : "transparent" }}>{emoji}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply indicator */}
          {hubReplyTo && (
            <div style={{ padding:"6px 14px", background:"rgba(255,255,255,0.04)", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontFamily:"Arial, sans-serif", fontSize:11, color:C.gray }}>↩ Replying to @{hubReplyTo.author}: {hubReplyTo.text?.slice(0,35)}...</div>
              <button onClick={() => setHubReplyTo(null)} style={{ background:"none", border:"none", color:C.gray, fontSize:16, cursor:"pointer" }}>✕</button>
            </div>
          )}

          {/* Message input */}
          <div style={{ padding:"10px 14px", borderTop:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", gap:8 }}>
              <input
                style={{ ...S.input, marginBottom:0, flex:1, fontSize:14, padding:"12px 14px" }}
                placeholder={hubReplyTo ? `Reply to @${hubReplyTo.author}...` : `Message ${group?.name}...`}
                value={hubMsgInput}
                onChange={e => setHubMsgInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendHubMsg()}
              />
              <button style={{ background:group?.color || C.pink, border:"none", borderRadius:10, padding:"0 16px", color:C.white, fontSize:18, cursor:"pointer" }} onClick={() => sendHubMsg()}>↑</button>
            </div>
          </div>

          {/* Poll modal */}
          {pollModal && (
            <div style={S.modal} onClick={() => setPollModal(false)}>
              <div style={S.modalBox} onClick={e => e.stopPropagation()}>
                <div style={{ fontSize:18, letterSpacing:3, color:C.gold, marginBottom:14 }}>📊 CREATE POLL</div>
                <input style={S.input} placeholder="Poll question *" value={pollForm.question} onChange={e => setPollForm(p => ({ ...p, question: e.target.value }))} />
                {pollForm.options.map((opt, oi) => (
                  <div key={oi} style={{ display:"flex", gap:8, marginBottom:8 }}>
                    <input style={{ ...S.input, marginBottom:0, flex:1 }} placeholder={`Option ${oi + 1}`} value={opt} onChange={e => { const opts = [...pollForm.options]; opts[oi] = e.target.value; setPollForm(p => ({ ...p, options: opts })); }} />
                    {oi >= 2 && <button onClick={() => setPollForm(p => ({ ...p, options: p.options.filter((_,i) => i !== oi) }))} style={{ background:"rgba(255,68,68,0.15)", border:"1px solid #FF4444", borderRadius:8, color:"#FF4444", fontSize:16, padding:"0 12px", cursor:"pointer" }}>✕</button>}
                  </div>
                ))}
                {pollForm.options.length < 4 && (
                  <button onClick={() => setPollForm(p => ({ ...p, options: [...p.options, ""] }))} style={{ ...S.btnCyan, marginBottom:12, fontSize:13 }}>+ Add Option</button>
                )}
                <button style={{ ...S.btnPink, background: pollForm.question.trim() && pollForm.options.filter(o=>o.trim()).length >= 2 ? `linear-gradient(135deg,${C.gold},#CC8800)` : "rgba(255,255,255,0.1)", color: pollForm.question.trim() ? "#000" : C.gray }} onClick={submitPoll}>CREATE POLL</button>
                <button style={S.btnCyan} onClick={() => setPollModal(false)}>CANCEL</button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── HUB HOME — group list ──
    return (
      <div style={S.app}>
        <div style={{ ...S.header, borderBottomColor:"#CC0000" }}>
          <button style={S.backBtn} onClick={() => setActiveTab("home")}>🏠</button>
          <div style={{ fontSize:18, letterSpacing:3 }}>🏟️ <span style={{ color:"#CC0000" }}>THE MMA</span> HUB</div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ background:"rgba(0,207,255,0.1)", border:`1px solid ${C.cyan}33`, borderRadius:20, padding:"4px 10px", fontSize:11, fontFamily:"Arial, sans-serif", color:C.cyan, cursor:"pointer" }} onClick={() => setCommView("gym")}>🏛️ MY GYM</div>
            <div style={S.avatar} onClick={() => setActiveTab("profile")}>{user.name[0].toUpperCase()}</div>
          </div>
        </div>

        {/* UFC 329 banner */}
        <div onClick={() => setActiveHubGroup("ufc329")} style={{ margin:"12px 16px", background:`linear-gradient(135deg,rgba(204,0,0,0.25),rgba(0,0,0,0.4))`, border:`1px solid rgba(204,0,0,0.4)`, borderRadius:14, padding:"14px 16px", cursor:"pointer" }}>
          <div style={{ fontSize:10, fontFamily:"Arial, sans-serif", color:"#FF4444", letterSpacing:2 }}>📅 UPCOMING · JULY 11</div>
          <div style={{ fontSize:18, letterSpacing:2, marginTop:2 }}>UFC 329: McGREGOR vs HOLLOWAY 2</div>
          <div style={{ fontSize:11, fontFamily:"Arial, sans-serif", color:C.gray, marginTop:3 }}>Tap to join the discussion · T-Mobile Arena, Las Vegas</div>
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <div onClick={e => { e.stopPropagation(); setActiveHubGroup("mma_odds"); }} style={{ background:`${C.gold}22`, border:`1px solid ${C.gold}44`, borderRadius:20, padding:"4px 12px", fontSize:11, color:C.gold, fontFamily:"Arial, sans-serif", cursor:"pointer" }}>📊 ODDS</div>
            <div onClick={e => { e.stopPropagation(); setActiveHubGroup("mma_bets"); }} style={{ background:"#9B5CFF22", border:"1px solid #9B5CFF44", borderRadius:20, padding:"4px 12px", fontSize:11, color:"#9B5CFF", fontFamily:"Arial, sans-serif", cursor:"pointer" }}>💰 BETS</div>
            <div onClick={e => { e.stopPropagation(); setActiveTab("ufc"); }} style={{ background:"rgba(204,0,0,0.15)", border:"1px solid rgba(204,0,0,0.4)", borderRadius:20, padding:"4px 12px", fontSize:11, color:"#FF4444", fontFamily:"Arial, sans-serif", cursor:"pointer" }}>🎯 PICKS</div>
          </div>
        </div>

        {/* Pinned groups */}
        <div style={{ padding:"0 16px" }}>
          <div style={{ fontSize:10, fontFamily:"Arial, sans-serif", color:C.gray, letterSpacing:2, marginBottom:10 }}>📌 FEATURED ROOMS</div>
          {HUB_GROUPS.filter(g => g.pinned).map(group => (
            <div key={group.id} onClick={() => setActiveHubGroup(group.id)} style={{ ...S.card, padding:"14px", marginBottom:10, cursor:"pointer", border:`1px solid ${group.color}33` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, letterSpacing:1, color:C.white }}>{group.name}</div>
                  <div style={{ fontSize:11, fontFamily:"Arial, sans-serif", color:C.gray, marginTop:3 }}>{group.desc}</div>
                  <div style={{ fontSize:10, fontFamily:"Arial, sans-serif", color:group.color, marginTop:4 }}>
                    {(hubMessages[group.id] || []).length} messages
                  </div>
                </div>
                <div style={{ fontSize:22, color:group.color }}>›</div>
              </div>
            </div>
          ))}

          {/* All groups */}
          <div style={{ fontSize:10, fontFamily:"Arial, sans-serif", color:C.gray, letterSpacing:2, marginBottom:10, marginTop:6 }}>ALL ROOMS</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {HUB_GROUPS.filter(g => !g.pinned).map(group => (
              <div key={group.id} onClick={() => setActiveHubGroup(group.id)} style={{ background:C.card, border:`1px solid ${group.color}33`, borderRadius:14, padding:"14px 12px", cursor:"pointer" }}>
                <div style={{ fontSize:20, marginBottom:6 }}>{group.name.split(" ")[0]}</div>
                <div style={{ fontSize:13, letterSpacing:1, color:C.white }}>{group.name.split(" ").slice(1).join(" ")}</div>
                <div style={{ fontSize:10, fontFamily:"Arial, sans-serif", color:C.gray, marginTop:4 }}>{(hubMessages[group.id] || []).length} msgs</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height:90 }} />
        <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
      </div>
    );
  }

    // ── COACHING TAB ──────────────────────────────────────────────
  if (activeTab === "coaching") {

    const sendCoachMsg = (studentId) => {
      if (!coachMsgInput.trim()) return;
      setCoachMsgs(prev => ({ ...prev, [studentId]: [...(prev[studentId] || []), { from: "Coach", text: coachMsgInput.trim(), time: "just now" }] }));
      setCoachMsgInput("");
    };

    const sendInviteToStudent = (username, name) => {
      setInvitesSent(prev => [...prev, { id: Date.now(), to: username, toName: name, from: user.username, type: "coach_to_student", status: "pending", time: "just now" }]);
    };
    const sendInviteToCoach = (username, name) => {
      setInvitesSent(prev => [...prev, { id: Date.now(), to: username, toName: name, from: user.username, type: "student_to_coach", status: "pending", time: "just now" }]);
    };
    const acceptInvite = (invite) => {
      if (invite.type === "coach_to_student") {
        setMyCoach({ username: invite.from, name: invite.fromName });
      } else {
        setRoster(prev => [...prev, { id: Date.now(), name: invite.fromName || invite.from, username: invite.from, avatar: (invite.fromName || invite.from)[1]?.toUpperCase() || "S", level: "Beginner", lastSeen: "just now", belt: "White", stripes: 0, grade: "C", notes: "" }]);
      }
      setInvitesReceived(prev => prev.filter(i => i.id !== invite.id));
    };
    const declineInvite = (inviteId) => setInvitesReceived(prev => prev.filter(i => i.id !== inviteId));

    const addSlot = (studentUsername) => {
      if (!slotForm.title.trim()) return;
      const slot = { id: Date.now(), day: slotForm.day, time: slotForm.time, type: slotForm.type, title: slotForm.title, detail: slotForm.detail };
      setSchedules(prev => ({ ...prev, [studentUsername]: [...(prev[studentUsername] || []), slot] }));
      setSlotForm({ day: "Mon", time: "6:00 PM", type: "video", title: "", detail: "" });
      setVideoPickerSearch("");
      setSlotModal(false);
    };
    const removeSlot = (studentUsername, slotId) => {
      setSchedules(prev => ({ ...prev, [studentUsername]: (prev[studentUsername] || []).filter(s => s.id !== slotId) }));
    };

    const typeIcon  = (t) => t === "video" ? "▶️" : t === "workout" ? "💪" : "🎯";
    const typeColor = (t) => t === "video" ? C.pink : t === "workout" ? C.cyan : C.gold;
    const typeLabel = (t) => t === "video" ? "TECHNIQUE VIDEO" : t === "workout" ? "PHYSICAL WORKOUT" : "FOCUS TECHNIQUE";

    // ── SLOT BUILDER MODAL CONTENT (shared) ──
    const SlotModal = ({ studentUsername }) => (
      <div style={S.modal}>
        <div style={S.modalBox}>
          <div style={{ fontSize: 20, letterSpacing: 3, marginBottom: 16 }}>📅 ADD TO SCHEDULE</div>

          <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 8 }}>DAY</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto" }}>
            {DAYS.map(d => (
              <div key={d} onClick={() => setSlotForm({ ...slotForm, day: d })} style={{ flex: "0 0 auto", padding: "8px 12px", borderRadius: 10, background: slotForm.day === d ? C.pink : "rgba(255,255,255,0.06)", color: slotForm.day === d ? C.white : C.gray, fontSize: 13, fontFamily: "Arial, sans-serif", cursor: "pointer" }}>{d}</div>
            ))}
          </div>

          <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 8 }}>TIME</div>
          <input style={S.input} placeholder="e.g. 6:00 PM" value={slotForm.time} onChange={e => setSlotForm({ ...slotForm, time: e.target.value })} />

          <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 8 }}>TYPE</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["video", "workout", "focus"].map(t => (
              <div key={t} onClick={() => setSlotForm({ ...slotForm, type: t, title: "", detail: "" })} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, textAlign: "center", background: slotForm.type === t ? `${typeColor(t)}22` : "rgba(255,255,255,0.06)", border: `1px solid ${slotForm.type === t ? typeColor(t) : "transparent"}`, cursor: "pointer" }}>
                <div style={{ fontSize: 18 }}>{typeIcon(t)}</div>
                <div style={{ fontSize: 9, fontFamily: "Arial, sans-serif", color: slotForm.type === t ? typeColor(t) : C.gray, marginTop: 4, letterSpacing: 1 }}>{typeLabel(t)}</div>
              </div>
            ))}
          </div>

          {slotForm.type === "video" ? (
            <>
              <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 8 }}>PICK A TECHNIQUE OR DRILL VIDEO</div>
              <input style={{ ...S.input, marginBottom: 10 }} placeholder="Search videos & drills..." value={videoPickerSearch} onChange={e => setVideoPickerSearch(e.target.value)} />
              <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 16, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                {allVideosList.filter(v => !videoPickerSearch.trim() || v.title.toLowerCase().includes(videoPickerSearch.toLowerCase()) || v.discipline.toLowerCase().includes(videoPickerSearch.toLowerCase())).slice(0, 60).map((v, i) => {
                  const isDrillVid = v.discipline === "mma_drills" || v.discipline === "striking_drills" || v.discipline === "grappling_drills";
                  return (
                    <div key={i} onClick={() => setSlotForm({ ...slotForm, title: v.title, detail: `${v.discipline} · ${v.section}` })} style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: slotForm.title === v.title ? `${C.pink}15` : "transparent", display: "flex", alignItems: "center", gap: 8 }}>
                      {isDrillVid && <span style={{ fontSize: 14 }}>🧩</span>}
                      <div>
                        <div style={{ fontSize: 13, letterSpacing: 1, color: slotForm.title === v.title ? C.pink : C.white }}>{v.title}</div>
                        <div style={{ fontSize: 10, fontFamily: "Arial, sans-serif", color: C.gray }}>{v.discipline} · {v.section}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : slotForm.type === "workout" ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif" }}>PICK A WORKOUT</div>
                <div onClick={() => setWorkoutModal(true)} style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.cyan, cursor: "pointer" }}>+ NEW WORKOUT</div>
              </div>
              <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 16, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                {customWorkouts.map(w => (
                  <div key={w.id} onClick={() => setSlotForm({ ...slotForm, title: w.name, detail: w.desc })} style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: slotForm.title === w.name ? `${C.cyan}15` : "transparent" }}>
                    <div style={{ fontSize: 13, letterSpacing: 1, color: slotForm.title === w.name ? C.cyan : C.white }}>{w.name}</div>
                    <div style={{ fontSize: 10, fontFamily: "Arial, sans-serif", color: C.gray }}>{w.desc}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 8 }}>FOCUS TECHNIQUE NAME</div>
              <input style={S.input} placeholder="e.g. Guard Retention, Jab Timing..." value={slotForm.title} onChange={e => setSlotForm({ ...slotForm, title: e.target.value })} />
              <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 8 }}>NOTE FOR STUDENT</div>
              <input style={S.input} placeholder="What should they focus on?" value={slotForm.detail} onChange={e => setSlotForm({ ...slotForm, detail: e.target.value })} />
            </>
          )}

          <button style={{ ...S.btnPink, background: slotForm.title.trim() ? `linear-gradient(135deg,${C.gold},#CC8800)` : "rgba(255,255,255,0.1)", color: slotForm.title.trim() ? "#000" : C.gray }} onClick={() => addSlot(studentUsername)}>ADD TO SCHEDULE</button>
          <button style={S.btnCyan} onClick={() => { setSlotModal(false); setVideoPickerSearch(""); }}>CANCEL</button>
        </div>
      </div>
    );

    // ── NEW WORKOUT MODAL ──
    const WorkoutModal = () => (
      <div style={S.modal}>
        <div style={S.modalBox}>
          <div style={{ fontSize: 20, letterSpacing: 3, marginBottom: 16 }}>💪 NEW WORKOUT</div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 8 }}>WORKOUT NAME</div>
          <input style={S.input} placeholder="e.g. Leg Day Conditioning" value={newWorkout.name} onChange={e => setNewWorkout({ ...newWorkout, name: e.target.value })} />
          <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 8 }}>DESCRIPTION</div>
          <textarea style={{ ...S.input, minHeight: 80, resize: "none" }} placeholder="Sets, reps, rounds, rest periods..." value={newWorkout.desc} onChange={e => setNewWorkout({ ...newWorkout, desc: e.target.value })} />
          <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 10 }}>CATEGORY</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {["Conditioning", "Strength", "Striking", "Grappling", "Mobility"].map(cat => (
              <div key={cat} onClick={() => setNewWorkout({ ...newWorkout, category: cat })} style={{ padding: "6px 14px", borderRadius: 20, background: newWorkout.category === cat ? C.cyan : "rgba(255,255,255,0.06)", color: newWorkout.category === cat ? "#000" : C.gray, fontSize: 12, fontFamily: "Arial, sans-serif", cursor: "pointer" }}>{cat}</div>
            ))}
          </div>
          <button style={S.btnPink} onClick={() => {
            if (!newWorkout.name.trim()) return;
            setCustomWorkouts(prev => [...prev, { id: Date.now(), ...newWorkout }]);
            setNewWorkout({ name: "", desc: "", category: "Conditioning" });
            setWorkoutModal(false);
          }}>SAVE WORKOUT</button>
          <button style={S.btnCyan} onClick={() => setWorkoutModal(false)}>CANCEL</button>
        </div>
      </div>
    );

    // ── STUDENT DETAIL + SCHEDULE BUILDER (coach view) ──
    if (coachingView === "studentview" && selectedStudent) {
      const student = roster.find(s => s.id === selectedStudent);
      const msgs = coachMsgs[selectedStudent] || [];
      const slots = schedules[student.username] || [];
      const focusSlot = slots.find(s => s.type === "focus");
      return (
        <div style={S.app}>
          <div style={{ ...S.header, borderBottomColor: C.gold }}>
            <button style={S.backBtn} onClick={() => setCoachingView("roster")}>←</button>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg,${C.pink},${C.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: "bold", marginLeft: 8 }}>{student.avatar}</div>
            <div style={{ marginLeft: 10, flex: 1 }}>
              <div style={{ fontSize: 16, letterSpacing: 2 }}>{student.name.toUpperCase()}</div>
              <div style={{ fontSize: 10, fontFamily: "Arial, sans-serif", color: student.level === "Beginner" ? C.cyan : student.level === "Intermediate" ? C.gold : C.green }}>{student.level} · Last seen {student.lastSeen}</div>
            </div>
          </div>

          <div style={{ padding: "14px 16px 0" }}>
            {/* Belt / Grade / Notes card */}
            <div style={{ ...S.card, padding: "16px", border: `1px solid ${C.border}`, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif" }}>SKILL PROFILE</div>
                <div onClick={() => { setProfileForm({ belt: student.belt, stripes: student.stripes, grade: student.grade, notes: student.notes }); setEditingProfile(true); }} style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gold, cursor: "pointer" }}>✎ EDIT</div>
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                {/* Belt rank */}
                <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 8 }}>GRAPPLING BELT</div>
                  <div style={{ width: 56, height: 14, background: BELT_COLORS[student.belt], borderRadius: 3, margin: "0 auto 8px", position: "relative", border: student.belt === "White" ? "1px solid #ccc" : "none", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 4, gap: 2 }}>
                    {Array.from({ length: student.stripes }).map((_, i) => <div key={i} style={{ width: 3, height: 10, background: "#fff" }} />)}
                  </div>
                  <div style={{ fontSize: 14, letterSpacing: 1, color: C.white }}>{student.belt}{student.stripes > 0 ? ` (${student.stripes})` : ""}</div>
                </div>
                {/* Striking grade */}
                <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 8 }}>STRIKING GRADE</div>
                  <div style={{ fontSize: 32, color: gradeColor(student.grade), lineHeight: 1 }}>{student.grade}</div>
                </div>
              </div>
              {/* Coach notes */}
              <div style={{ fontSize: 10, letterSpacing: 2, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 6 }}>COACH'S NOTES</div>
              <div style={{ fontFamily: "Arial, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px" }}>
                {student.notes || "No notes yet — tap Edit to add coaching notes."}
              </div>
            </div>

            {/* Focus technique highlight */}
            {focusSlot && (
              <div style={{ background: `linear-gradient(135deg,${C.gold}22,${C.gold}08)`, border: `1px solid ${C.gold}44`, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 11, letterSpacing: 3, color: C.gold, fontFamily: "Arial, sans-serif", marginBottom: 6 }}>🎯 CURRENT FOCUS TECHNIQUE</div>
                <div style={{ fontSize: 17, letterSpacing: 1, color: C.white }}>{focusSlot.title}</div>
                {focusSlot.detail && <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 4 }}>{focusSlot.detail}</div>}
              </div>
            )}

            {/* Weekly schedule */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif" }}>WEEKLY SCHEDULE</div>
              <div onClick={() => setSlotModal(true)} style={{ background: `${C.gold}22`, border: `1px solid ${C.gold}44`, borderRadius: 8, padding: "5px 12px", fontSize: 12, fontFamily: "Arial, sans-serif", color: C.gold, cursor: "pointer" }}>+ ADD SLOT</div>
            </div>

            {DAYS.map(day => {
              const daySlots = slots.filter(s => s.day === day);
              if (daySlots.length === 0) return null;
              return (
                <div key={day} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, letterSpacing: 2, color: C.cyan, fontFamily: "Arial, sans-serif", marginBottom: 6 }}>{day.toUpperCase()}</div>
                  {daySlots.map(slot => (
                    <div key={slot.id} style={{ ...S.card, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, border: `1px solid ${typeColor(slot.type)}33` }}>
                      <div style={{ fontSize: 20 }}>{typeIcon(slot.type)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, letterSpacing: 1, color: C.white }}>{slot.title}</div>
                        <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 2 }}>{slot.time} · {slot.detail}</div>
                      </div>
                      <button onClick={() => removeSlot(student.username, slot.id)} style={{ background: "none", border: "none", color: C.gray, fontSize: 18, cursor: "pointer" }}>✕</button>
                    </div>
                  ))}
                </div>
              );
            })}
            {slots.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 0", fontFamily: "Arial, sans-serif", color: C.gray, fontSize: 13 }}>No schedule yet — tap + Add Slot to build their week 📅</div>
            )}

            {/* Coach message */}
            <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif", margin: "20px 0 8px" }}>MESSAGES TO STUDENT</div>
            {msgs.map((m, i) => (
              <div key={i} style={{ background: C.card2, borderRadius: 12, padding: "10px 14px", marginBottom: 8, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, color: C.gold, letterSpacing: 1, marginBottom: 4 }}>🎓 {m.from} <span style={{ color: C.gray, fontSize: 10 }}>{m.time}</span></div>
                <div style={{ fontFamily: "Arial, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>{m.text}</div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 8, marginBottom: 16 }}>
              <input style={{ ...S.input, marginBottom: 0, flex: 1, padding: "10px 14px", fontSize: 14, background: "rgba(255,255,255,0.06)" }} placeholder="Send a note to this student..." value={coachMsgInput} onChange={e => setCoachMsgInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendCoachMsg(student.id)} />
              <button onClick={() => sendCoachMsg(student.id)} style={{ background: `linear-gradient(135deg,${C.gold},#CC8800)`, border: "none", borderRadius: 10, padding: "0 16px", color: "#000", fontSize: 18, cursor: "pointer" }}>➤</button>
            </div>
          </div>
          <div style={{ height: 90 }} />
          <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
          {slotModal && <SlotModal studentUsername={student.username} />}
          {workoutModal && <WorkoutModal />}
          {editingProfile && (
            <div style={S.modal}>
              <div style={S.modalBox}>
                <div style={{ fontSize: 20, letterSpacing: 3, marginBottom: 16 }}>✎ EDIT SKILL PROFILE</div>

                <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 8 }}>GRAPPLING BELT</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {BELTS.map(b => (
                    <div key={b} onClick={() => setProfileForm({ ...profileForm, belt: b })} style={{ flex: "1 0 30%", padding: "10px 6px", borderRadius: 10, textAlign: "center", cursor: "pointer", background: profileForm.belt === b ? `${BELT_COLORS[b]}33` : "rgba(255,255,255,0.06)", border: `2px solid ${profileForm.belt === b ? BELT_COLORS[b] : "transparent"}` }}>
                      <div style={{ width: 36, height: 10, background: BELT_COLORS[b], borderRadius: 2, margin: "0 auto 6px", border: b === "White" ? "1px solid #ccc" : "none" }} />
                      <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: profileForm.belt === b ? C.white : C.gray }}>{b}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 8 }}>STRIPES</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {[0,1,2,3,4].map(n => (
                    <div key={n} onClick={() => setProfileForm({ ...profileForm, stripes: n })} style={{ flex: 1, padding: "10px", borderRadius: 10, textAlign: "center", cursor: "pointer", background: profileForm.stripes === n ? `${C.gold}33` : "rgba(255,255,255,0.06)", border: `1px solid ${profileForm.stripes === n ? C.gold : "transparent"}`, color: profileForm.stripes === n ? C.gold : C.gray, fontSize: 14 }}>{n}</div>
                  ))}
                </div>

                <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 8 }}>STRIKING GRADE</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                  {GRADES.map(g => (
                    <div key={g} onClick={() => setProfileForm({ ...profileForm, grade: g })} style={{ flex: "1 0 18%", padding: "8px 4px", borderRadius: 8, textAlign: "center", cursor: "pointer", background: profileForm.grade === g ? `${gradeColor(g)}33` : "rgba(255,255,255,0.06)", border: `1px solid ${profileForm.grade === g ? gradeColor(g) : "transparent"}`, color: profileForm.grade === g ? gradeColor(g) : C.gray, fontSize: 13 }}>{g}</div>
                  ))}
                </div>

                <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 8 }}>COACH'S NOTES</div>
                <textarea style={{ ...S.input, minHeight: 100, resize: "none", lineHeight: 1.6 }} placeholder="Strengths, weaknesses, areas to work on..." value={profileForm.notes} onChange={e => setProfileForm({ ...profileForm, notes: e.target.value })} />

                <button style={{ ...S.btnPink, background: `linear-gradient(135deg,${C.gold},#CC8800)`, color: "#000" }} onClick={() => {
                  setRoster(prev => prev.map(s => s.id === selectedStudent ? { ...s, belt: profileForm.belt, stripes: profileForm.stripes, grade: profileForm.grade, notes: profileForm.notes } : s));
                  setEditingProfile(false);
                }}>SAVE PROFILE</button>
                <button style={S.btnCyan} onClick={() => setEditingProfile(false)}>CANCEL</button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── ROSTER VIEW ──
    if (coachingView === "roster") {
      return (
        <div style={S.app}>
          <div style={{ ...S.header, borderBottomColor: C.gold }}>
            <button style={S.backBtn} onClick={() => setCoachingView("home")}>←</button>
            <div style={{ fontSize: 18, letterSpacing: 3, marginLeft: 10 }}>👥 MY <span style={{ color: C.gold }}>ROSTER</span></div>
          </div>
          <div style={{ padding: "14px 16px" }}>
            {roster.map(s => {
              const slots = schedules[s.username] || [];
              return (
                <div key={s.id} onClick={() => { setSelectedStudent(s.id); setCoachingView("studentview"); }} style={{ ...S.card, padding: "14px 16px", display: "flex", gap: 14, alignItems: "center", cursor: "pointer", border: `1px solid ${C.gold}33` }}>
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: s.level === "Beginner" ? `linear-gradient(135deg,${C.cyan},#0088AA)` : s.level === "Intermediate" ? `linear-gradient(135deg,${C.gold},#CC8800)` : `linear-gradient(135deg,${C.green},#009944)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: "bold", flexShrink: 0 }}>{s.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, letterSpacing: 2 }}>{s.name.toUpperCase()}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "2px 8px" }}>
                        <div style={{ width: 16, height: 6, background: BELT_COLORS[s.belt], borderRadius: 2, border: s.belt === "White" ? "1px solid #ccc" : "none" }} />
                        <span style={{ fontSize: 10, fontFamily: "Arial, sans-serif", color: C.gray }}>{s.belt}{s.stripes > 0 ? ` ${s.stripes}°` : ""}</span>
                      </div>
                      <div style={{ background: `${gradeColor(s.grade)}22`, borderRadius: 8, padding: "2px 8px" }}>
                        <span style={{ fontSize: 10, fontFamily: "Arial, sans-serif", color: gradeColor(s.grade) }}>{s.grade}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 4 }}>{slots.length} scheduled · Last seen {s.lastSeen}</div>
                  </div>
                  <div style={{ color: C.gold, fontSize: 20 }}>›</div>
                </div>
              );
            })}
            <div onClick={() => setCoachingView("invites")} style={{ border: `2px dashed ${C.gold}44`, borderRadius: 14, padding: "14px", textAlign: "center", cursor: "pointer", color: C.gold, fontSize: 14, letterSpacing: 2, marginTop: 8 }}>+ INVITE A STUDENT</div>
          </div>
          <div style={{ height: 90 }} />
          <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
        </div>
      );
    }

    // ── INVITES VIEW (search + send invites, see pending) ──
    if (coachingView === "invites") {
      const allUsers = [
        { username: "@student_a", name: "Student A" }, { username: "@student_b", name: "Student B" }, { username: "@student_c", name: "Student C" },
        { username: "@grappleking", name: "Grapple King" }, { username: "@strikeforce", name: "StrikeForce" }, { username: "@matwarrior", name: "Mat Warrior" },
        { username: "@nkm_bkk", name: "Bkk Nak Muay" }, { username: "@ironsprawl", name: "Iron Sprawl" },
      ].filter(u => !roster.some(r => r.username === u.username));
      const filtered = allUsers.filter(u => u.name.toLowerCase().includes(inviteSearch.toLowerCase()) || u.username.toLowerCase().includes(inviteSearch.toLowerCase()));
      const myPending = invitesSent.filter(i => i.from === user.username);
      return (
        <div style={S.app}>
          <div style={{ ...S.header, borderBottomColor: C.gold }}>
            <button style={S.backBtn} onClick={() => setCoachingView("roster")}>←</button>
            <div style={{ fontSize: 18, letterSpacing: 3, marginLeft: 10 }}>✉️ INVITE <span style={{ color: C.gold }}>STUDENTS</span></div>
          </div>
          <div style={{ padding: "14px 16px 0" }}>
            <input style={S.input} placeholder="Search by name or username..." value={inviteSearch} onChange={e => setInviteSearch(e.target.value)} />
          </div>
          {myPending.length > 0 && (
            <div style={{ padding: "0 16px" }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 8 }}>PENDING INVITES</div>
              {myPending.map(inv => (
                <div key={inv.id} style={{ ...S.card, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, letterSpacing: 1 }}>{inv.toName}</div>
                    <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray }}>{inv.to}</div>
                  </div>
                  <div style={{ background: `${C.gold}22`, border: `1px solid ${C.gold}44`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gold }}>⏳ PENDING</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ padding: "0 16px" }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 8, marginTop: myPending.length > 0 ? 8 : 0 }}>USERS</div>
            {filtered.map(u => {
              const alreadySent = myPending.some(i => i.to === u.username);
              return (
                <div key={u.username} style={{ ...S.card, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${C.pink},${C.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: "bold" }}>{u.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, letterSpacing: 1 }}>{u.name}</div>
                    <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray }}>{u.username}</div>
                  </div>
                  <button disabled={alreadySent} onClick={() => sendInviteToStudent(u.username, u.name)} style={{ background: alreadySent ? "rgba(255,255,255,0.06)" : `${C.gold}22`, border: `1px solid ${alreadySent ? C.border : C.gold}44`, borderRadius: 8, padding: "6px 14px", color: alreadySent ? C.gray : C.gold, fontSize: 12, fontFamily: "Arial, sans-serif", cursor: alreadySent ? "default" : "pointer" }}>
                    {alreadySent ? "SENT" : "INVITE"}
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ height: 90 }} />
          <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
        </div>
      );
    }

    // ── FIND A COACH VIEW (student side) ──
    if (coachingView === "findcoach") {
      const coaches = [
        { username: "@coach_mma", name: "Coach MMA", specialty: "BJJ & Wrestling", gym: "American Top Team" },
        { username: "@grappleking", name: "Grapple King", specialty: "BJJ Submissions", gym: "Gracie Barra" },
        { username: "@strikeforce", name: "StrikeForce", specialty: "Boxing & Muay Thai", gym: "Jackson-Wink MMA" },
      ];
      const filtered = coaches.filter(c => c.name.toLowerCase().includes(inviteSearch.toLowerCase()) || c.specialty.toLowerCase().includes(inviteSearch.toLowerCase()));
      const myPending = invitesSent.filter(i => i.from === user.username && i.type === "student_to_coach");
      return (
        <div style={S.app}>
          <div style={{ ...S.header, borderBottomColor: C.gold }}>
            <button style={S.backBtn} onClick={() => setCoachingView("home")}>←</button>
            <div style={{ fontSize: 18, letterSpacing: 3, marginLeft: 10 }}>🔍 FIND A <span style={{ color: C.gold }}>COACH</span></div>
          </div>
          <div style={{ padding: "14px 16px 0" }}>
            <input style={S.input} placeholder="Search by name or specialty..." value={inviteSearch} onChange={e => setInviteSearch(e.target.value)} />
          </div>
          <div style={{ padding: "0 16px" }}>
            {filtered.map(c => {
              const alreadySent = myPending.some(i => i.to === c.username);
              return (
                <div key={c.username} style={{ ...S.card, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: `linear-gradient(135deg,${C.gold},#CC8800)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: "bold" }}>{c.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, letterSpacing: 1 }}>{c.name}</div>
                    <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: C.gold, marginTop: 2 }}>{c.specialty}</div>
                    <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 2 }}>{c.gym}</div>
                  </div>
                  <button disabled={alreadySent} onClick={() => sendInviteToCoach(c.username, c.name)} style={{ background: alreadySent ? "rgba(255,255,255,0.06)" : `${C.gold}22`, border: `1px solid ${alreadySent ? C.border : C.gold}44`, borderRadius: 8, padding: "6px 14px", color: alreadySent ? C.gray : C.gold, fontSize: 12, fontFamily: "Arial, sans-serif", cursor: alreadySent ? "default" : "pointer" }}>
                    {alreadySent ? "SENT" : "REQUEST"}
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ height: 90 }} />
          <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
        </div>
      );
    }

    // ── MY SCHEDULE (student side, viewing their own) ──
    if (coachingView === "mycoach") {
      const mySlots = schedules[user.username] || [];
      return (
        <div style={S.app}>
          <div style={{ ...S.header, borderBottomColor: C.gold }}>
            <button style={S.backBtn} onClick={() => setCoachingView("home")}>←</button>
            <div style={{ fontSize: 18, letterSpacing: 3, marginLeft: 10 }}>📅 MY <span style={{ color: C.gold }}>SCHEDULE</span></div>
          </div>
          <div style={{ padding: "14px 16px" }}>
            {myCoach && (
              <div style={{ background: `linear-gradient(135deg,${C.gold}18,${C.gold}06)`, border: `1px solid ${C.gold}33`, borderRadius: 14, padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg,${C.gold},#CC8800)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: "bold" }}>{myCoach.name[0]}</div>
                <div><div style={{ fontSize: 14, letterSpacing: 1 }}>{myCoach.name}</div><div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gold }}>Your Coach</div></div>
              </div>
            )}
            {DAYS.map(day => {
              const daySlots = mySlots.filter(s => s.day === day);
              if (daySlots.length === 0) return null;
              return (
                <div key={day} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, letterSpacing: 2, color: C.cyan, fontFamily: "Arial, sans-serif", marginBottom: 6 }}>{day.toUpperCase()}</div>
                  {daySlots.map(slot => (
                    <div key={slot.id} style={{ ...S.card, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, border: `1px solid ${typeColor(slot.type)}33` }}>
                      <div style={{ fontSize: 20 }}>{typeIcon(slot.type)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, letterSpacing: 1, color: C.white }}>{slot.title}</div>
                        <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 2 }}>{slot.time} · {slot.detail}</div>
                      </div>
                      {slot.type === "video" && (() => { const v = allVideosList.find(x => x.title === slot.title); return v?.youtubeUrl ? <button onClick={() => window.open(v.youtubeUrl, "_blank")} style={{ background: `${C.pink}22`, border: `1px solid ${C.pink}44`, borderRadius: 8, padding: "5px 10px", color: C.pink, fontSize: 11, fontFamily: "Arial, sans-serif", cursor: "pointer" }}>WATCH</button> : null; })()}
                    </div>
                  ))}
                </div>
              );
            })}
            {mySlots.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", fontFamily: "Arial, sans-serif", color: C.gray, fontSize: 14 }}>Your coach hasn't built your schedule yet 📅</div>}
          </div>
          <div style={{ height: 90 }} />
          <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
        </div>
      );
    }

    // ── TEAM CHAT VIEW ──
    if (coachingView === "team") {
      const teamKey = `team_${userTeam?.id}_chat`;
      const QUICK_EMOJIS_T = ["👊","🔥","💯","😂","🤔","👀","🏆","💪","🥋","❤️"];

      const sendTeamMsg = async (isPoll = false, pollData = null) => {
        if (!userTeam) return;
        if (!isPoll && !teamMsgInput.trim()) return;
        const newMsg = isPoll ? {
          author: user.name, avatar: user.name[0].toUpperCase(), ts: Date.now(),
          time: new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),
          type: "poll", question: pollData.question,
          options: pollData.options.filter(o=>o.trim()).map(o=>({text:o,votes:{}})),
          reactions: {}
        } : {
          author: user.name, avatar: user.name[0].toUpperCase(), ts: Date.now(),
          time: new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),
          text: teamMsgInput.trim(), replyTo: teamReplyTo || null, reactions: {}, type: "text"
        };
        await fbPush(`team_chats/${teamKey}`, newMsg);
        setTeamMsgInput(""); setTeamReplyTo(null);
      };

      const addTeamReaction = async (msgIdx, emoji) => {
        const msg = teamMessages[msgIdx];
        if (!msg?._key) return;
        const reactions = { ...(msg.reactions||{}) };
        const users = { ...(reactions[emoji]||{}) };
        if (users[user.name]) delete users[user.name]; else users[user.name] = true;
        if (!Object.keys(users).length) delete reactions[emoji]; else reactions[emoji] = users;
        await fbPatch(`team_chats/${teamKey}/${msg._key}`, { reactions });
        setTeamEmojiPicker(null);
      };

      const voteTeamPoll = async (msgIdx, optIdx) => {
        const msg = teamMessages[msgIdx];
        if (!msg?._key) return;
        const options = msg.options.map(opt => ({ ...opt, votes: { ...(opt.votes||{}) } }));
        options.forEach(opt => delete opt.votes[user.name]);
        if (!(msg.options[optIdx].votes||{})[user.name]) options[optIdx].votes[user.name] = true;
        await fbPatch(`team_chats/${teamKey}/${msg._key}`, { options });
      };

      const submitTeamPoll = () => {
        const opts = teamPollForm.options.filter(o=>o.trim());
        if (!teamPollForm.question.trim() || opts.length < 2) return;
        sendTeamMsg(true, { question: teamPollForm.question, options: opts });
        setTeamPollModal(false); setTeamPollForm({ question:"", options:["",""] });
      };

      return (
        <div style={{ ...S.app, display:"flex", flexDirection:"column" }} onClick={() => setTeamEmojiPicker(null)}>
          {/* Header */}
          <div style={{ ...S.header, borderBottomColor: C.cyan }}>
            <button style={S.backBtn} onClick={() => setCoachingView("home")}>←</button>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, letterSpacing:2, color: C.cyan }}>{userTeam?.name || "TEAM CHAT"}</div>
              <div style={{ fontSize:10, fontFamily:"Arial, sans-serif", color:C.gray }}>Private team channel</div>
            </div>
            <button onClick={() => setTeamPollModal(true)} style={{ background:`${C.gold}22`, border:`1px solid ${C.gold}44`, borderRadius:20, padding:"5px 10px", fontSize:10, color:C.gold, cursor:"pointer", fontFamily:"Arial, sans-serif", marginRight:6 }}>📊</button>
          </div>

          {/* Sub-tabs */}
          <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
            {[["chat","💬 CHAT"],["drills","📋 DRILLS"],["requests","🙋 REQUESTS"],["members","👥 TEAM"]].map(([id,label]) => (
              <div key={id} onClick={() => setTeamView(id)} style={{ flex:1, padding:"10px 4px", textAlign:"center", fontSize:10, fontFamily:"Arial, sans-serif", letterSpacing:1, color:teamView===id ? C.cyan : C.gray, borderBottom:`2px solid ${teamView===id ? C.cyan : "transparent"}`, cursor:"pointer" }}>{label}</div>
            ))}
          </div>

          {/* ── CHAT ── */}
          {teamView === "chat" && (
            <>
              <div style={{ flex:1, padding:"12px 14px", overflowY:"auto" }}>
                {teamMessages.length === 0 && (
                  <div style={{ textAlign:"center", padding:"40px 0", fontFamily:"Arial, sans-serif", color:C.gray, fontSize:13 }}>
                    No messages yet — start the team conversation! 🥋
                  </div>
                )}
                {teamMessages.map((m, i) => {
                  const myR = Object.entries(m.reactions||{}).filter(([,u]) => u&&u[user.name]).map(([e])=>e);
                  const totalV = m.type==="poll" ? m.options.reduce((a,o)=>a+Object.keys(o.votes||{}).length,0) : 0;
                  return (
                    <div key={i} style={{ marginBottom:16 }}>
                      {m.replyTo && (
                        <div style={{ marginLeft:36, marginBottom:4, background:"rgba(255,255,255,0.04)", borderLeft:`2px solid ${C.gray}`, borderRadius:"0 8px 8px 0", padding:"4px 10px" }}>
                          <div style={{ fontSize:10, fontFamily:"Arial, sans-serif", color:C.gray }}>↩ @{m.replyTo.author}: {m.replyTo.text?.slice(0,40)}{m.replyTo.text?.length>40?"...":""}</div>
                        </div>
                      )}
                      <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                        <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg,${C.cyan},${C.pink})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 }}>{m.avatar}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                            <span style={{ fontFamily:"Arial, sans-serif", fontSize:12, color:C.cyan, fontWeight:"bold" }}>@{m.author}</span>
                            <span style={{ fontFamily:"Arial, sans-serif", fontSize:10, color:C.gray }}>{m.time}</span>
                            {m.author === (isCoach ? user.name : roster.find(s=>s.name===m.author)?.name) && isCoach && <span style={{ fontSize:9, background:`${C.gold}22`, color:C.gold, borderRadius:10, padding:"1px 6px", fontFamily:"Arial, sans-serif" }}>COACH</span>}
                          </div>
                          {m.type === "poll" ? (
                            <div style={{ background:`rgba(0,207,255,0.06)`, border:`1px solid ${C.cyan}33`, borderRadius:12, padding:"12px" }}>
                              <div style={{ fontSize:13, fontFamily:"Arial, sans-serif", color:C.white, marginBottom:10, fontWeight:"bold" }}>📊 {m.question}</div>
                              {m.options.map((opt,oi) => {
                                const pct = totalV>0 ? Math.round(Object.keys(opt.votes||{}).length/totalV*100) : 0;
                                const voted = (opt.votes||{})[user.name];
                                return (
                                  <div key={oi} onClick={() => voteTeamPoll(i,oi)} style={{ marginBottom:8, cursor:"pointer" }}>
                                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                                      <span style={{ fontFamily:"Arial, sans-serif", fontSize:12, color:voted?C.cyan:C.white }}>{voted?"✓ ":""}{opt.text}</span>
                                      <span style={{ fontFamily:"Arial, sans-serif", fontSize:12, color:C.gray }}>{pct}%</span>
                                    </div>
                                    <div style={{ height:6, background:"rgba(255,255,255,0.08)", borderRadius:3, overflow:"hidden" }}>
                                      <div style={{ height:"100%", width:`${pct}%`, background:voted?C.cyan:C.gray, borderRadius:3, transition:"width 0.3s" }} />
                                    </div>
                                  </div>
                                );
                              })}
                              <div style={{ fontSize:10, fontFamily:"Arial, sans-serif", color:C.gray, marginTop:6 }}>{totalV} votes</div>
                            </div>
                          ) : (
                            <div style={{ fontFamily:"Arial, sans-serif", fontSize:13, color:"rgba(255,255,255,0.85)", lineHeight:1.5 }}>{m.text}</div>
                          )}
                          <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap", alignItems:"center" }}>
                            {Object.entries(m.reactions||{}).filter(([,u])=>u&&Object.keys(u).length>0).map(([emoji,users]) => (
                              <div key={emoji} onClick={() => addTeamReaction(i,emoji)} style={{ background:users[user.name]?`${C.cyan}22`:"rgba(255,255,255,0.06)", border:`1px solid ${users[user.name]?C.cyan+"66":C.border}`, borderRadius:20, padding:"3px 8px", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:3 }}>
                                {emoji}<span style={{ fontFamily:"Arial, sans-serif", fontSize:11, color:C.gray }}>{Object.keys(users).length}</span>
                              </div>
                            ))}
                            <div onClick={() => addTeamReaction(i,"👍")} style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:20, padding:"3px 8px", fontSize:13, cursor:"pointer" }}>👍 {Object.keys(m.reactions?.["👍"]||{}).length||""}</div>
                            <div onClick={() => setTeamEmojiPicker(teamEmojiPicker===i?null:i)} style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:20, padding:"3px 8px", fontSize:13, cursor:"pointer" }}>😀</div>
                            <div onClick={() => setTeamReplyTo({ msgIdx:i, author:m.author, text:m.text||m.question })} style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:20, padding:"3px 8px", fontSize:11, fontFamily:"Arial, sans-serif", color:C.gray, cursor:"pointer" }}>↩ Reply</div>
                          </div>
                          {teamEmojiPicker===i && (
                            <div onClick={e=>e.stopPropagation()} style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8, background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"10px" }}>
                              {QUICK_EMOJIS_T.map(emoji => (
                                <div key={emoji} onClick={() => addTeamReaction(i,emoji)} style={{ fontSize:20, cursor:"pointer", padding:"4px", borderRadius:8, background:myR.includes(emoji)?`${C.cyan}22`:"transparent" }}>{emoji}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {teamReplyTo && (
                <div style={{ padding:"6px 14px", background:"rgba(255,255,255,0.04)", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontFamily:"Arial, sans-serif", fontSize:11, color:C.gray }}>↩ Replying to @{teamReplyTo.author}</div>
                  <button onClick={() => setTeamReplyTo(null)} style={{ background:"none", border:"none", color:C.gray, fontSize:16, cursor:"pointer" }}>✕</button>
                </div>
              )}
              <div style={{ padding:"10px 14px", borderTop:`1px solid ${C.border}`, display:"flex", gap:8 }}>
                <input style={{ ...S.input, marginBottom:0, flex:1, fontSize:14, padding:"12px 14px" }} placeholder="Message your team..." value={teamMsgInput} onChange={e=>setTeamMsgInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendTeamMsg()} />
                <button style={{ background:C.cyan, border:"none", borderRadius:10, padding:"0 16px", color:"#000", fontSize:18, cursor:"pointer" }} onClick={()=>sendTeamMsg()}>↑</button>
              </div>
            </>
          )}

          {/* ── ASSIGNED DRILLS ── */}
          {teamView === "drills" && (
            <div style={{ flex:1, padding:"14px 16px", overflowY:"auto" }}>
              {isCoach && (
                <button style={{ ...S.btnPink, background:`linear-gradient(135deg,${C.cyan},#0099CC)`, color:"#000", marginBottom:16 }} onClick={() => setAssignDrillModal(true)}>
                  📋 ASSIGN DRILL TO TEAM
                </button>
              )}
              {assignedDrills.length === 0 && (
                <div style={{ textAlign:"center", padding:"40px 0", fontFamily:"Arial, sans-serif", color:C.gray }}>
                  {isCoach ? "No drills assigned yet — assign your first drill above!" : "Your coach hasn't assigned any drills yet."}
                </div>
              )}
              {assignedDrills.map((drill, i) => (
                <div key={i} style={{ ...S.card, padding:"14px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, letterSpacing:1 }}>{drill.title}</div>
                      <div style={{ fontSize:11, fontFamily:"Arial, sans-serif", color:C.cyan, marginTop:3 }}>📋 Assigned by Coach · {drill.time}</div>
                      {drill.note && <div style={{ fontSize:12, fontFamily:"Arial, sans-serif", color:C.gray, marginTop:4 }}>"{drill.note}"</div>}
                    </div>
                    {drill.youtubeUrl && (
                      <button onClick={() => window.open(drill.youtubeUrl,"_blank")} style={{ background:`${C.pink}22`, border:`1px solid ${C.pink}44`, borderRadius:8, padding:"6px 10px", fontSize:12, color:C.pink, cursor:"pointer", fontFamily:"Arial, sans-serif", flexShrink:0 }}>▶ Watch</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── DRILL REQUESTS ── */}
          {teamView === "requests" && (
            <div style={{ flex:1, padding:"14px 16px", overflowY:"auto" }}>
              {!isCoach && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11, fontFamily:"Arial, sans-serif", color:C.gray, letterSpacing:2, marginBottom:8 }}>REQUEST A DRILL FOR PRACTICE</div>
                  <div style={{ display:"flex", gap:8 }}>
                    <input style={{ ...S.input, marginBottom:0, flex:1 }} placeholder="What technique do you want to learn?" value={drillRequestInput} onChange={e=>setDrillRequestInput(e.target.value)} />
                    <button style={{ background:C.cyan, border:"none", borderRadius:10, padding:"0 14px", color:"#000", fontSize:16, cursor:"pointer" }} onClick={async () => {
                      if (!drillRequestInput.trim()) return;
                      await fbPush(`team_requests/${userTeam.id}`, { text: drillRequestInput.trim(), from: user.name, ts: Date.now(), time: new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}), status: "pending" });
                      setDrillRequestInput("");
                    }}>→</button>
                  </div>
                </div>
              )}
              {isCoach && drillRequests.filter(r=>r.status==="pending").length > 0 && (
                <div style={{ background:`${C.gold}10`, border:`1px solid ${C.gold}33`, borderRadius:12, padding:"10px 14px", marginBottom:12, fontFamily:"Arial, sans-serif", fontSize:12, color:C.gold }}>
                  📬 {drillRequests.filter(r=>r.status==="pending").length} pending drill request{drillRequests.filter(r=>r.status==="pending").length!==1?"s":""}
                </div>
              )}
              {drillRequests.length === 0 && (
                <div style={{ textAlign:"center", padding:"40px 0", fontFamily:"Arial, sans-serif", color:C.gray }}>
                  {isCoach ? "No drill requests from students yet." : "Your requests will appear here once submitted."}
                </div>
              )}
              {[...drillRequests].reverse().map((req, i) => (
                <div key={i} style={{ ...S.card, padding:"14px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, letterSpacing:1 }}>{req.text}</div>
                      <div style={{ fontSize:11, fontFamily:"Arial, sans-serif", color:C.gray, marginTop:3 }}>From @{req.from} · {req.time}</div>
                    </div>
                    <div style={{ background:req.status==="done"?`${C.green}22`:`${C.gold}22`, border:`1px solid ${req.status==="done"?C.green:C.gold}55`, borderRadius:20, padding:"3px 10px", fontSize:10, color:req.status==="done"?C.green:C.gold, fontFamily:"Arial, sans-serif", flexShrink:0 }}>
                      {req.status==="done"?"✅ DONE":"⏳ PENDING"}
                    </div>
                  </div>
                  {isCoach && req.status==="pending" && (
                    <button onClick={async () => { await fbPatch(`team_requests/${userTeam.id}/${req._key}`, { status:"done" }); }} style={{ ...S.btnCyan, marginTop:10, fontSize:12, padding:"8px", background:`linear-gradient(135deg,${C.green},#009944)`, color:C.white }}>✓ MARK AS COVERED</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── MEMBERS ── */}
          {teamView === "members" && (
            <div style={{ flex:1, padding:"14px 16px", overflowY:"auto" }}>
              <div style={{ ...S.card, padding:"16px", marginBottom:12 }}>
                <div style={{ fontSize:20, letterSpacing:3, color:C.cyan }}>{userTeam?.name}</div>
                <div style={{ fontSize:12, fontFamily:"Arial, sans-serif", color:C.gray, marginTop:4 }}>Private team · {roster.length + 1} members</div>
              </div>
              {/* Coach */}
              <div style={{ fontSize:10, fontFamily:"Arial, sans-serif", color:C.gray, letterSpacing:2, marginBottom:8 }}>COACH</div>
              <div style={{ ...S.card, padding:"12px 14px", marginBottom:14, border:`1px solid ${C.gold}44` }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${C.gold},#CC8800)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{user.name[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize:14, letterSpacing:1 }}>{user.name}</div>
                    <div style={{ fontSize:10, fontFamily:"Arial, sans-serif", color:C.gold }}>🎓 Head Coach</div>
                  </div>
                </div>
              </div>
              {/* Students */}
              <div style={{ fontSize:10, fontFamily:"Arial, sans-serif", color:C.gray, letterSpacing:2, marginBottom:8 }}>STUDENTS ({roster.length})</div>
              {roster.length === 0 && <div style={{ fontFamily:"Arial, sans-serif", fontSize:13, color:C.gray, textAlign:"center", padding:"20px 0" }}>No students yet — invite them from the Coaching tab!</div>}
              {roster.map((s,i) => (
                <div key={i} style={{ ...S.card, padding:"12px 14px", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${C.cyan},${C.pink})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{s.name[0].toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize:14, letterSpacing:1 }}>{s.name}</div>
                      <div style={{ fontSize:10, fontFamily:"Arial, sans-serif", color:C.cyan }}>🥋 Student</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ height:80 }} />
          <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />

          {/* Poll Modal */}
          {teamPollModal && (
            <div style={S.modal} onClick={() => setTeamPollModal(false)}>
              <div style={S.modalBox} onClick={e=>e.stopPropagation()}>
                <div style={{ fontSize:18, letterSpacing:3, color:C.cyan, marginBottom:14 }}>📊 CREATE TEAM POLL</div>
                <input style={S.input} placeholder="Poll question *" value={teamPollForm.question} onChange={e=>setTeamPollForm(p=>({...p,question:e.target.value}))} />
                {teamPollForm.options.map((opt,oi) => (
                  <div key={oi} style={{ display:"flex", gap:8, marginBottom:8 }}>
                    <input style={{ ...S.input, marginBottom:0, flex:1 }} placeholder={`Option ${oi+1}`} value={opt} onChange={e=>{ const opts=[...teamPollForm.options]; opts[oi]=e.target.value; setTeamPollForm(p=>({...p,options:opts})); }} />
                    {oi>=2 && <button onClick={() => setTeamPollForm(p=>({...p,options:p.options.filter((_,i)=>i!==oi)}))} style={{ background:"rgba(255,68,68,0.15)", border:"1px solid #FF4444", borderRadius:8, color:"#FF4444", fontSize:16, padding:"0 12px", cursor:"pointer" }}>✕</button>}
                  </div>
                ))}
                {teamPollForm.options.length < 4 && <button onClick={() => setTeamPollForm(p=>({...p,options:[...p.options,""]}))} style={{ ...S.btnCyan, marginBottom:12, fontSize:13 }}>+ Add Option</button>}
                <button style={{ ...S.btnPink, background: teamPollForm.question.trim()&&teamPollForm.options.filter(o=>o.trim()).length>=2 ? `linear-gradient(135deg,${C.cyan},#0099CC)` : "rgba(255,255,255,0.1)", color: teamPollForm.question.trim()?"#000":C.gray }} onClick={submitTeamPoll}>CREATE POLL</button>
                <button style={S.btnCyan} onClick={() => setTeamPollModal(false)}>CANCEL</button>
              </div>
            </div>
          )}

          {/* Assign Drill Modal */}
          {assignDrillModal && (
            <div style={S.modal} onClick={() => setAssignDrillModal(false)}>
              <div style={{ ...S.modalBox, maxHeight:"75vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
                <div style={{ fontSize:18, letterSpacing:3, color:C.cyan, marginBottom:14 }}>📋 ASSIGN DRILL</div>
                <div style={{ fontSize:11, fontFamily:"Arial, sans-serif", color:C.gray, marginBottom:12 }}>Pick from the drill library:</div>
                {Object.entries(videos.striking_drills?.offense||{}).map(([bucket,vids]) =>
                  vids.map((v,i) => (
                    <div key={`s_${bucket}_${i}`} onClick={async () => {
                      await fbPush(`team_drills/${userTeam.id}`, { title:v.title, youtubeUrl:v.youtubeUrl||null, ts:Date.now(), time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}), bucket });
                      setAssignDrillModal(false);
                    }} style={{ ...S.card, padding:"12px 14px", marginBottom:8, cursor:"pointer" }}>
                      <div style={{ fontSize:13, letterSpacing:0.5 }}>{v.title}</div>
                      <div style={{ fontSize:10, fontFamily:"Arial, sans-serif", color:C.pink, marginTop:2 }}>🥊 {bucket}</div>
                    </div>
                  ))
                )}
                {Object.values(videos.grappling_drills?.offense||{}).map((vids,bi) =>
                  vids.map((v,i) => (
                    <div key={`g_${bi}_${i}`} onClick={async () => {
                      await fbPush(`team_drills/${userTeam.id}`, { title:v.title, youtubeUrl:v.youtubeUrl||null, ts:Date.now(), time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}), bucket:"Grappling" });
                      setAssignDrillModal(false);
                    }} style={{ ...S.card, padding:"12px 14px", marginBottom:8, cursor:"pointer" }}>
                      <div style={{ fontSize:13, letterSpacing:0.5 }}>{v.title}</div>
                      <div style={{ fontSize:10, fontFamily:"Arial, sans-serif", color:C.cyan, marginTop:2 }}>🤼 Grappling</div>
                    </div>
                  ))
                )}
                <button style={S.btnCyan} onClick={() => setAssignDrillModal(false)}>CANCEL</button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── COACHING HOME ──
    const myReceivedInvites = invitesReceived;
    return (
      <div style={S.app}>
        <div style={{ ...S.header, borderBottomColor: C.gold }}>
          <button style={S.backBtn} onClick={() => setActiveTab("home")}>🏠</button>
          <div style={{ fontSize: 18, letterSpacing: 3 }}>🎓 <span style={{ color: C.gold }}>COACHING</span></div>
          <div style={S.avatar} onClick={() => setActiveTab("profile")}>{user.name[0].toUpperCase()}</div>
        </div>

        {/* Pending invitations banner — shown to anyone with received invites */}
        {myReceivedInvites.length > 0 && (
          <div style={{ padding: "14px 16px 0" }}>
            {myReceivedInvites.map(inv => (
              <div key={inv.id} style={{ background: `linear-gradient(135deg,${C.gold}22,${C.gold}08)`, border: `1px solid ${C.gold}55`, borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
                <div style={{ fontSize: 12, letterSpacing: 2, color: C.gold, fontFamily: "Arial, sans-serif", marginBottom: 6 }}>
                  {inv.type === "coach_to_student" ? "🎓 COACH INVITATION" : "🙋 STUDENT REQUEST"}
                </div>
                <div style={{ fontSize: 14, fontFamily: "Arial, sans-serif", color: "rgba(255,255,255,0.85)", marginBottom: 12 }}>
                  <b>{inv.fromName || inv.from}</b> {inv.type === "coach_to_student" ? "wants to coach you" : "wants you as their coach"} · {inv.time}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => acceptInvite(inv)} style={{ flex: 1, background: `linear-gradient(135deg,${C.green},#009944)`, border: "none", borderRadius: 8, padding: "10px", color: C.white, fontSize: 13, fontFamily: "Arial, sans-serif", cursor: "pointer" }}>✓ ACCEPT</button>
                  <button onClick={() => declineInvite(inv.id)} style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px", color: C.gray, fontSize: 13, fontFamily: "Arial, sans-serif", cursor: "pointer" }}>DECLINE</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isCoach ? (
          <>
            <div style={{ padding: "14px 16px 0" }}>
              <div style={{ background: `linear-gradient(135deg,rgba(255,215,0,0.15),rgba(255,215,0,0.04))`, border: `1px solid ${C.gold}44`, borderRadius: 16, padding: "20px" }}>
                <div style={{ fontSize: 22, letterSpacing: 3, color: C.gold, marginBottom: 6 }}>🎓 ARE YOU A COACH?</div>
                <div style={{ fontFamily: "Arial, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, marginBottom: 16 }}>Join the world's biggest MMA coaching platform. Invite students, build weekly schedules, assign drills and physical workouts — all in one place.</div>
                <button onClick={() => setIsCoach(true)} style={{ ...S.btnPink, background: `linear-gradient(135deg,${C.gold},#CC8800)`, color: "#000", fontSize: 18 }}>REGISTER AS COACH</button>
              </div>
            </div>

            {/* Student tools */}
            <div style={{ padding: "14px 16px 0" }}>
              {myCoach ? (
                <>
                <div onClick={() => setCoachingView("mycoach")} style={{ background: `linear-gradient(135deg,${C.cyan}18,${C.cyan}06)`, border: `1px solid ${C.cyan}44`, borderRadius: 14, padding: "16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg,${C.gold},#CC8800)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: "bold" }}>{myCoach.name[0]}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 15, letterSpacing: 2, color: C.cyan }}>📅 MY SCHEDULE</div><div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 3 }}>Coached by {myCoach.name}</div></div>
                  <div style={{ color: C.cyan, fontSize: 20 }}>›</div>
                </div>
                {/* Team Chat shortcut for students */}
                <div onClick={() => userTeam ? setCoachingView("team") : setTeamJoinModal(true)} style={{ background: `${C.cyan}10`, border: `1px solid ${C.cyan}33`, borderRadius: 14, padding: "16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 28 }}>💬</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 15, letterSpacing: 2, color: C.cyan }}>{userTeam ? `💬 ${userTeam.name} CHAT` : "JOIN A TEAM"}</div><div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 3 }}>{userTeam ? "Private team channel" : "Enter your team code to join"}</div></div>
                  <div style={{ color: C.cyan, fontSize: 20 }}>›</div>
                </div>
                </>
              ) : (
                <div onClick={() => setCoachingView("findcoach")} style={{ background: `${C.cyan}10`, border: `2px dashed ${C.cyan}44`, borderRadius: 14, padding: "16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 28 }}>🔍</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 15, letterSpacing: 2, color: C.cyan }}>FIND A COACH</div><div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 3 }}>Request a coach to build your training plan</div></div>
                  <div style={{ color: C.cyan, fontSize: 20 }}>›</div>
                </div>
              )}
            </div>

            {/* Student view — assigned schedule preview */}
            {myCoach && (
              <>
                <div style={{ fontSize: 11, letterSpacing: 3, color: C.gray, padding: "8px 16px 8px", fontFamily: "Arial, sans-serif" }}>📅 THIS WEEK</div>
                <div style={{ padding: "0 16px" }}>
                  {(schedules[user.username] || []).slice(0, 4).map(slot => (
                    <div key={slot.id} style={{ ...S.card, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, border: `1px solid ${typeColor(slot.type)}33` }}>
                      <div style={{ fontSize: 18 }}>{typeIcon(slot.type)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, letterSpacing: 1 }}>{slot.title}</div>
                        <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 2 }}>{slot.day} · {slot.time}</div>
                      </div>
                    </div>
                  ))}
                  {(schedules[user.username] || []).length === 0 && (
                    <div style={{ textAlign: "center", padding: "20px 0", fontFamily: "Arial, sans-serif", color: C.gray, fontSize: 13 }}>No schedule yet. Ask your coach to build one! 🥋</div>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {/* Coach dashboard */}
            <div style={{ padding: "14px 16px 0" }}>
              <div style={{ background: `linear-gradient(135deg,rgba(255,215,0,0.12),rgba(255,215,0,0.04))`, border: `1px solid ${C.gold}44`, borderRadius: 16, padding: "16px 18px", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg,${C.gold},#CC8800)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: "bold" }}>{user.name[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 18, letterSpacing: 2, color: C.gold }}>COACH {user.name.toUpperCase()}</div>
                    <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 2 }}>{userTeam?.name || "Independent Coach"} · {roster.length} students</div>
                  </div>
                  <div style={{ marginLeft: "auto", background: `${C.gold}22`, border: `1px solid ${C.gold}44`, borderRadius: 20, padding: "4px 12px", fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gold }}>🎓 COACH</div>
                </div>
              </div>

              {/* Quick stats */}
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                {[[roster.length+"","STUDENTS",C.gold],[Object.values(schedules).reduce((a,s)=>a+s.length,0)+"","SLOTS BUILT",C.pink],[customWorkouts.length+"","WORKOUTS",C.cyan]].map(([val,lbl,col],i) => (
                  <div key={i} style={{ flex: 1, background: C.card, borderRadius: 12, padding: "12px 8px", textAlign: "center", border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 24, color: col }}>{val}</div>
                    <div style={{ fontSize: 9, fontFamily: "Arial, sans-serif", color: C.gray, letterSpacing: 1 }}>{lbl}</div>
                  </div>
                ))}
              </div>

              {/* Coach actions */}
              {[
                { icon: "💬", label: "MY TEAM CHAT", sub: userTeam ? `${userTeam.name} — private team channel` : "Create or join a team first", color: C.cyan, action: () => userTeam ? setCoachingView("team") : setTeamCreateModal(true) },
                { icon: "👥", label: "MY ROSTER", sub: `${roster.length} students enrolled`, color: C.gold, action: () => setCoachingView("roster") },
                { icon: "✉️", label: "INVITE STUDENTS", sub: "Search and invite new students", color: C.pink, action: () => setCoachingView("invites") },
                { icon: "💪", label: "MY WORKOUT LIBRARY", sub: `${customWorkouts.length} custom workouts saved`, color: C.cyan, action: () => setWorkoutModal(true) },
                { icon: "🏛️", label: "JOIN YOUR GYM", sub: userTeam ? userTeam.name : "Register under your academy", color: C.gold, action: () => setShowGymPick(true) },
              ].map((item, i) => (
                <div key={i} onClick={item.action} style={{ background: `${item.color}10`, border: `1px solid ${item.color}33`, borderRadius: 14, padding: "16px", marginBottom: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ fontSize: 30 }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, letterSpacing: 2, color: item.color }}>{item.label}</div>
                    <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 3 }}>{item.sub}</div>
                  </div>
                  <div style={{ color: item.color, fontSize: 20 }}>›</div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ height: 90 }} />
        <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
        {workoutModal && isCoach && <WorkoutModal />}

        {/* Gym picker modal */}
        {/* Create Team Modal */}
        {teamCreateModal && (
          <div style={S.modal}>
            <div style={S.modalBox}>
              <div style={{ fontSize:18, letterSpacing:3, color:C.cyan, marginBottom:14 }}>💬 CREATE YOUR TEAM</div>
              <div style={{ fontSize:12, fontFamily:"Arial, sans-serif", color:C.gray, marginBottom:16 }}>Name your team (e.g. "BTC" or "Team Alpha")</div>
              <input style={S.input} placeholder="Team name *" value={teamCreateName} onChange={e=>setTeamCreateName(e.target.value)} />
              <button style={{ ...S.btnPink, background:teamCreateName.trim()?`linear-gradient(135deg,${C.cyan},#0099CC)`:"rgba(255,255,255,0.1)", color:teamCreateName.trim()?"#000":C.gray }} onClick={() => {
                if (!teamCreateName.trim()) return;
                const id = Date.now();
                setUserTeam({ id, name: teamCreateName.trim() });
                setTeamCreateModal(false); setTeamCreateName("");
                setCoachingView("team");
              }}>CREATE TEAM</button>
              <button style={S.btnCyan} onClick={() => setTeamCreateModal(false)}>CANCEL</button>
            </div>
          </div>
        )}

        {/* Join Team Modal */}
        {teamJoinModal && (
          <div style={S.modal}>
            <div style={S.modalBox}>
              <div style={{ fontSize:18, letterSpacing:3, color:C.cyan, marginBottom:14 }}>💬 JOIN A TEAM</div>
              <div style={{ fontSize:12, fontFamily:"Arial, sans-serif", color:C.gray, marginBottom:16 }}>Enter your team name or invite code</div>
              <input style={S.input} placeholder="Team name or code *" value={teamJoinName} onChange={e=>setTeamJoinName(e.target.value)} />
              <div style={{ background:`${C.gold}10`, border:`1px solid ${C.gold}33`, borderRadius:10, padding:"10px 12px", marginBottom:14, fontFamily:"Arial, sans-serif", fontSize:12, color:C.gray }}>
                ⏳ Your request will be sent to the coach for approval.
              </div>
              <button style={{ ...S.btnPink, background:teamJoinName.trim()?`linear-gradient(135deg,${C.cyan},#0099CC)`:"rgba(255,255,255,0.1)", color:teamJoinName.trim()?"#000":C.gray }} onClick={() => {
                if (!teamJoinName.trim()) return;
                setUserTeam({ id: teamJoinName.trim().toLowerCase().replace(/\s/g,"_"), name: teamJoinName.trim() });
                setTeamJoinModal(false); setTeamJoinName("");
                setCoachingView("team");
              }}>SEND JOIN REQUEST</button>
              <button style={S.btnCyan} onClick={() => setTeamJoinModal(false)}>CANCEL</button>
            </div>
          </div>
        )}

        {showGymPick && (
          <div style={S.modal}>
            <div style={{ ...S.modalBox, maxHeight: "80vh", overflowY: "auto" }}>
              <div style={{ fontSize: 18, letterSpacing: 3, color: C.gold, marginBottom: 14 }}>🏛️ JOIN YOUR GYM</div>
              <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: C.gray, marginBottom: 16 }}>Select your academy to connect with your gym community</div>
              {GYMS.map((gym, i) => (
                <div key={i} onClick={() => { setUserTeam({ name: gym.name, id: i }); setShowGymPick(false); }} style={{ background: userTeam?.name === gym.name ? `${C.gold}22` : "rgba(255,255,255,0.04)", border: `1px solid ${userTeam?.name === gym.name ? C.gold : C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, letterSpacing: 1 }}>{gym.name}</div>
                    <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 2 }}>{gym.members?.length || 0} members</div>
                  </div>
                  {userTeam?.name === gym.name && <span style={{ color: C.gold }}>✓</span>}
                </div>
              ))}
              <button style={S.btnCyan} onClick={() => setShowGymPick(false)}>CLOSE</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── UFC PICKS & BETS TAB ──────────────────────────────────────
  if (activeTab === "ufc") {
    const card = UFC_CARDS.find(c => c.id === selectedCard) || UFC_CARDS[0];
    const upcomingCards = UFC_CARDS.filter(c => c.status !== "completed");
    const completedCards = UFC_CARDS.filter(c => c.status === "completed");
    const isLocked = !!lockedCards[card.id];
    const mainFights   = card.fights.filter(f => f.card === "main");
    const prelimFights = card.fights.filter(f => f.card === "prelim");
    const visibleFights = cardFilter === "main" ? mainFights : prelimFights;

    const makePick = (fightId, side) => {
      if (isLocked) return;
      setUfcPicks(prev => ({ ...prev, [`${card.id}_${fightId}`]: prev[`${card.id}_${fightId}`] === side ? null : side }));
    };
    const getPick = (fightId) => ufcPicks[`${card.id}_${fightId}`];
    const getBet  = (fightId) => ufcBets[`${card.id}_${fightId}`];
    const totalPicked = card.fights.filter(f => getPick(f.id)).length;
    const allPicked = totalPicked === card.fights.length;
    const lockInPicks = () => setLockedCards(prev => ({ ...prev, [card.id]: true }));

    const totalBets = Object.values(ufcBets).reduce((a, b) => a + (parseInt(b.amount) || 0), 0);
    const allP = pickHistory.flatMap(h => h.picks);
    const totalCorrect = allP.filter(p => p.correct).length;
    const totalRecord  = allP.length;
    const accuracy = totalRecord > 0 ? Math.round((totalCorrect / totalRecord) * 100) : 0;

    // ── HISTORY / RESULTS VIEW ──
    if (ufcView === "history") {
      return (
        <div style={S.app}>
          <div style={S.header}>
            <button style={S.backBtn} onClick={() => setUfcView("cards")}>←</button>
            <div style={{ fontSize: 16, letterSpacing: 3 }}>📊 RESULTS & HISTORY</div>
          </div>
          <div style={{ background: `linear-gradient(135deg,rgba(204,0,0,0.15),rgba(0,0,0,0))`, padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 10 }}>
              {[[totalCorrect+"","CORRECT",C.green],[(totalRecord-totalCorrect)+"","WRONG","#FF4444"],[accuracy+"%","ACCURACY",C.gold],[tmmTokens+"","TMM TOKENS","#9B5CFF"]].map(([val,lbl,col],i) => (
                <div key={i} style={{ flex: 1, background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "12px 4px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, color: col }}>{val}</div>
                  <div style={{ fontSize: 8, fontFamily: "Arial, sans-serif", color: C.gray, letterSpacing: 1, marginTop: 2 }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: "14px 20px" }}>
            {completedCards.map((h, hi) => {
              return (
                <div key={hi} style={{ ...S.card, padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 15, letterSpacing: 1 }}>{h.event}</div>
                      <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray }}>{h.date} · {h.location}</div>
                    </div>
                    <div style={{ background: `${C.green}22`, border: `1px solid ${C.green}55`, borderRadius: 20, padding: "4px 10px", fontSize: 11, color: C.green }}>COMPLETED</div>
                  </div>
                  {h.fights.slice(0,3).map((f, fi) => (
                    <div key={fi} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray }}>{f.f1.name} vs {f.f2.name}</div>
                      <div style={{ fontSize: 10, fontFamily: "Arial, sans-serif", color: C.gray }}>—</div>
                    </div>
                  ))}
                </div>
              );
            })}
            {pickHistory.length === 0 && completedCards.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", fontFamily: "Arial, sans-serif", color: C.gray }}>No completed events yet!</div>
            )}
          </div>
          <div style={{ height: 80 }} />
          <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
        </div>
      );
    }

    // ── FIGHT CHAT MODAL ──
    if (fightChatModal) {
      const chatKey = `${card.id}_${fightChatModal.id}`;
      const messages = fightChat[chatKey] || [];
      return (
        <div style={S.app}>
          <div style={S.header}>
            <button style={S.backBtn} onClick={() => setFightChatModal(null)}>←</button>
            <div style={{ flex: 1, fontSize: 13, letterSpacing: 1 }}>💬 {fightChatModal.f1.name} vs {fightChatModal.f2.name}</div>
          </div>
          <div style={{ padding: "12px 16px", flex: 1, overflowY: "auto" }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", fontFamily: "Arial, sans-serif", color: C.gray, fontSize: 13 }}>
                No comments yet — be the first to predict! 🥊
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg,${C.pink},${C.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{m.user[0].toUpperCase()}</div>
                  <span style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: C.pink }}>@{m.user}</span>
                  <span style={{ fontFamily: "Arial, sans-serif", fontSize: 10, color: C.gray }}>{m.time}</span>
                </div>
                <div style={{ fontFamily: "Arial, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.85)", paddingLeft: 36, lineHeight: 1.5 }}>{m.text}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
            <input
              style={{ ...S.input, marginBottom: 0, flex: 1, fontSize: 14, padding: "12px 14px" }}
              placeholder="Who wins? Why? 🥊"
              value={fightChatMsg}
              onChange={e => setFightChatMsg(e.target.value)}
            />
            <button
              style={{ background: C.pink, border: "none", borderRadius: 10, padding: "0 16px", color: C.white, fontSize: 20, cursor: "pointer" }}
              onClick={() => {
                if (!fightChatMsg.trim()) return;
                const chatKey = `${card.id}_${fightChatModal.id}`;
                setFightChat(prev => ({ ...prev, [chatKey]: [...(prev[chatKey] || []), { user: user.name, text: fightChatMsg.trim(), time: "Just now" }] }));
                setFightChatMsg("");
              }}
            >↑</button>
          </div>
          <div style={{ height: 20 }} />
        </div>
      );
    }

    // ── BET MODAL ──
    if (betModal) {
      const fight = betModal;
      return (
        <div style={S.app}>
          <div style={S.header}>
            <button style={S.backBtn} onClick={() => { setBetModal(null); setBetForm({ side: null, method: null, amount: "" }); }}>←</button>
            <div style={{ fontSize: 14, letterSpacing: 2 }}>💰 PLACE BET</div>
            <div style={{ background: "#9B5CFF22", border: "1px solid #9B5CFF", borderRadius: 20, padding: "4px 10px", fontSize: 11, color: "#9B5CFF", fontFamily: "Arial, sans-serif" }}>{tmmTokens} TMM</div>
          </div>
          <div style={{ padding: "16px 20px" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "14px", marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, marginBottom: 6 }}>{fight.type} · {fight.weight}</div>
              <div style={{ fontSize: 18, letterSpacing: 1 }}>{fight.f1.name} vs {fight.f2.name}</div>
            </div>

            {/* Pick winner */}
            <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, letterSpacing: 2, marginBottom: 10 }}>1. PICK THE WINNER</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
              {[["f1", fight.f1], ["f2", fight.f2]].map(([side, f]) => (
                <div key={side} onClick={() => setBetForm(prev => ({ ...prev, side }))} style={{ flex: 1, padding: "14px 8px", borderRadius: 12, border: `2px solid ${betForm.side === side ? "#CC0000" : C.border}`, background: betForm.side === side ? "rgba(204,0,0,0.15)" : "rgba(255,255,255,0.04)", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 14, letterSpacing: 0.5 }}>{f.name}</div>
                  <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: f.odds.startsWith("-") ? C.green : "#FF6666", marginTop: 4 }}>{f.odds}</div>
                </div>
              ))}
            </div>

            {/* Method of victory */}
            <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, letterSpacing: 2, marginBottom: 10 }}>2. METHOD OF VICTORY</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
              {fight.methods.map(m => (
                <div key={m} onClick={() => setBetForm(prev => ({ ...prev, method: m }))} style={{ padding: "8px 14px", borderRadius: 20, border: `1px solid ${betForm.method === m ? C.gold : C.border}`, background: betForm.method === m ? `${C.gold}22` : "rgba(255,255,255,0.04)", color: betForm.method === m ? C.gold : C.gray, fontSize: 12, fontFamily: "Arial, sans-serif", cursor: "pointer" }}>{m}</div>
              ))}
            </div>

            {/* Bet amount */}
            <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, letterSpacing: 2, marginBottom: 10 }}>3. BET AMOUNT (TMM TOKENS)</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[25, 50, 100, 250].map(amt => (
                <div key={amt} onClick={() => setBetForm(prev => ({ ...prev, amount: String(Math.min(amt, tmmTokens)) }))} style={{ flex: 1, padding: "10px 4px", borderRadius: 10, border: `1px solid ${betForm.amount === String(amt) ? "#9B5CFF" : C.border}`, background: betForm.amount === String(amt) ? "#9B5CFF22" : "rgba(255,255,255,0.04)", color: betForm.amount === String(amt) ? "#9B5CFF" : C.gray, fontSize: 13, fontFamily: "Arial, sans-serif", cursor: "pointer", textAlign: "center" }}>{amt}</div>
              ))}
            </div>
            <input style={{ ...S.input, marginBottom: 18 }} placeholder="Or enter custom amount..." value={betForm.amount} inputMode="numeric" onChange={e => setBetForm(prev => ({ ...prev, amount: e.target.value.replace(/\D/g,"") }))} />

            <button
              style={{ ...S.btnPink, background: betForm.side && betForm.method && parseInt(betForm.amount) > 0 ? `linear-gradient(135deg,${C.gold},#CC8800)` : "rgba(255,255,255,0.1)", color: betForm.side && betForm.method && parseInt(betForm.amount) > 0 ? "#000" : C.gray, fontSize: 18 }}
              onClick={() => {
                const amt = parseInt(betForm.amount);
                if (!betForm.side || !betForm.method || !amt || amt > tmmTokens) return;
                const betKey = `${card.id}_${fight.id}`;
                setUfcBets(prev => ({ ...prev, [betKey]: { side: betForm.side, method: betForm.method, amount: amt, fighter: fight[betForm.side].name } }));
                setTmmTokens(prev => prev - amt);
                setBetModal(null);
                setBetForm({ side: null, method: null, amount: "" });
              }}
            >
              💰 PLACE BET — {betForm.amount || "0"} TMM
            </button>
            <button style={S.btnCyan} onClick={() => { setBetModal(null); setBetForm({ side: null, method: null, amount: "" }); }}>CANCEL</button>
          </div>
        </div>
      );
    }

    // ── MAIN PICKS & BETS VIEW ──
    return (
      <div style={S.app}>
        <div style={S.header}>
          <div style={{ fontSize: 16, letterSpacing: 3 }}>🏟️ <span style={{ color: "#CC0000" }}>UFC</span> PICKS & BETS</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: "#9B5CFF22", border: "1px solid #9B5CFF55", borderRadius: 20, padding: "4px 10px", fontSize: 11, fontFamily: "Arial, sans-serif", color: "#9B5CFF" }}>💰 {tmmTokens} TMM</div>
            <div onClick={() => setUfcView("history")} style={{ background: "rgba(204,0,0,0.15)", border: "1px solid rgba(204,0,0,0.4)", borderRadius: 20, padding: "4px 10px", fontSize: 11, fontFamily: "Arial, sans-serif", color: "#FF4444", cursor: "pointer" }}>📊 RESULTS</div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
          {[["picks","🎯 PICKS"],["bets","💰 BETS"],["discuss","💬 DISCUSS"]].map(([id, label]) => (
            <div key={id} onClick={() => setUfcSubView(id)} style={{ flex: 1, padding: "12px 4px", textAlign: "center", fontSize: 12, fontFamily: "Arial, sans-serif", letterSpacing: 1, color: ufcSubView === id ? "#CC0000" : C.gray, borderBottom: `2px solid ${ufcSubView === id ? "#CC0000" : "transparent"}`, cursor: "pointer" }}>{label}</div>
          ))}
        </div>

        {/* Event banner */}
        <div style={{ background: `linear-gradient(135deg,rgba(204,0,0,0.2),rgba(0,0,0,0.3))`, padding: "16px 20px", borderBottom: `1px solid rgba(204,0,0,0.2)` }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#FF4444", fontFamily: "Arial, sans-serif", marginBottom: 2 }}>{card.status === "live" ? "🔴 LIVE NOW" : "📅 UPCOMING"}</div>
          <div style={{ fontSize: 22, letterSpacing: 3 }}>{card.event} · {card.subtitle}</div>
          <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 4 }}>{card.date} · {card.venue} · {card.broadcast}</div>
          {card.draftkings && (
            <div onClick={() => window.open(card.draftkings, "_blank")} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, background: "#1B5E20", borderRadius: 20, padding: "6px 14px", cursor: "pointer" }}>
              <span style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: "#4CAF50", fontWeight: "bold" }}>🎰 BET ON DRAFTKINGS →</span>
            </div>
          )}
        </div>

        {/* ── PICKS SUB-TAB ── */}
        {ufcSubView === "picks" && (
          <div style={{ padding: "0 16px" }}>
            {/* Lock banner */}
            {isLocked ? (
              <div style={{ margin: "12px 0", background: `${C.green}15`, border: `1px solid ${C.green}44`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <span>🔒</span><div style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: C.green }}>Your picks are locked in — good luck!</div>
              </div>
            ) : allPicked ? (
              <div style={{ margin: "12px 0" }}>
                <button style={{ ...S.btnPink, background: `linear-gradient(135deg,${C.green},#009944)` }} onClick={lockInPicks}>🔒 LOCK IN ALL PICKS</button>
              </div>
            ) : (
              <div style={{ margin: "12px 0", fontFamily: "Arial, sans-serif", fontSize: 12, color: C.gray, textAlign: "center" }}>{totalPicked}/{card.fights.length} fights picked</div>
            )}

            {/* Card filter */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {["main", "prelim"].map(f => (
                <div key={f} onClick={() => setCardFilter(f)} style={{ flex: 1, textAlign: "center", padding: "8px", borderRadius: 10, background: cardFilter === f ? "#CC0000" : "rgba(255,255,255,0.06)", color: cardFilter === f ? C.white : C.gray, fontSize: 12, fontFamily: "Arial, sans-serif", cursor: "pointer" }}>
                  {f === "main" ? "🏆 MAIN CARD" : "📋 PRELIMS"}
                </div>
              ))}
            </div>

            {visibleFights.map(fight => {
              const pick = getPick(fight.id);
              const bet = getBet(fight.id);
              const chatCount = (fightChat[`${card.id}_${fight.id}`] || []).length;
              return (
                <div key={fight.id} style={{ ...S.card, padding: "14px" }}>
                  <div style={{ fontSize: 10, fontFamily: "Arial, sans-serif", color: C.gold, letterSpacing: 2, marginBottom: 8, textAlign: "center" }}>{fight.type} · {fight.weight}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    {[["f1", fight.f1], ["f2", fight.f2]].map(([side, f]) => (
                      <div key={side} onClick={() => makePick(fight.id, side)} style={{ flex: 1, textAlign: "center", padding: "12px 6px", borderRadius: 10, cursor: isLocked ? "default" : "pointer", background: pick === side ? "rgba(204,0,0,0.25)" : "rgba(255,255,255,0.04)", border: `2px solid ${pick === side ? "#CC0000" : "transparent"}`, opacity: isLocked && pick !== side ? 0.5 : 1 }}>
                        <div style={{ fontSize: 18, marginBottom: 2 }}>{f.country}</div>
                        <div style={{ fontSize: 12, letterSpacing: 0.5, lineHeight: 1.2 }}>{f.name}</div>
                        <div style={{ fontSize: 10, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 2 }}>{f.record}</div>
                        <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: f.odds.startsWith("-") ? C.green : "#FF6666", marginTop: 2, fontWeight: "bold" }}>{f.odds}</div>
                        {pick === side && <div style={{ fontSize: 9, color: "#FF4444", marginTop: 4, letterSpacing: 1 }}>✓ PICKED</div>}
                      </div>
                    ))}
                  </div>
                  {/* Action row */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <div onClick={() => { setBetModal(fight); setBetForm({ side: null, method: null, amount: "" }); }} style={{ flex: 1, background: "rgba(255,215,0,0.08)", border: `1px solid ${C.gold}44`, borderRadius: 8, padding: "8px", textAlign: "center", cursor: "pointer" }}>
                      <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gold }}>{bet ? `💰 ${bet.amount} TMM on ${bet.fighter}` : "💰 PLACE BET"}</div>
                    </div>
                    <div onClick={() => setFightChatModal(fight)} style={{ background: "rgba(0,207,255,0.08)", border: `1px solid ${C.cyan}44`, borderRadius: 8, padding: "8px 12px", textAlign: "center", cursor: "pointer" }}>
                      <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.cyan }}>💬 {chatCount > 0 ? chatCount : "CHAT"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── BETS SUB-TAB ── */}
        {ufcSubView === "bets" && (
          <div style={{ padding: "14px 16px" }}>
            <div style={{ background: "#9B5CFF15", border: "1px solid #9B5CFF44", borderRadius: 14, padding: "16px", marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 32, color: "#9B5CFF" }}>{tmmTokens}</div>
              <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, letterSpacing: 2 }}>TMM TOKENS AVAILABLE</div>
              <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 6 }}>New members get 500 tokens · Refreshes monthly</div>
            </div>
            {Object.keys(ufcBets).length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0", fontFamily: "Arial, sans-serif", color: C.gray }}>
                No bets placed yet — go to Picks tab and tap 💰 on any fight!
              </div>
            ) : (
              Object.entries(ufcBets).map(([key, bet]) => {
                const fightId = parseInt(key.split("_").pop());
                const fight = card.fights.find(f => f.id === fightId);
                if (!fight) return null;
                return (
                  <div key={key} style={{ ...S.card, padding: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, letterSpacing: 1 }}>{fight.f1.name} vs {fight.f2.name}</div>
                        <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 3 }}>Pick: <span style={{ color: C.white }}>{bet.fighter}</span> · Method: <span style={{ color: C.gold }}>{bet.method}</span></div>
                      </div>
                      <div style={{ background: "#9B5CFF22", border: "1px solid #9B5CFF55", borderRadius: 20, padding: "6px 12px", fontSize: 14, color: "#9B5CFF", fontFamily: "Arial, sans-serif", fontWeight: "bold" }}>{bet.amount} TMM</div>
                    </div>
                  </div>
                );
              })
            )}
            <div style={{ marginTop: 16, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "14px", fontFamily: "Arial, sans-serif", fontSize: 12, color: C.gray, lineHeight: 1.7 }}>
              💡 <strong style={{ color: C.white }}>How TMM Tokens work:</strong> All new members receive 500 TMM tokens. Use them to bet on fights for fun — no real money involved. Tokens refresh to 500 on the 1st of every month. Top token holders may unlock exclusive MMA Manual merch!
            </div>
          </div>
        )}

        {/* ── DISCUSS SUB-TAB ── */}
        {ufcSubView === "discuss" && (
          <div style={{ padding: "14px 16px" }}>
            <div style={{ fontFamily: "Arial, sans-serif", fontSize: 13, color: C.gray, marginBottom: 14 }}>Tap any fight to join the discussion 👇</div>
            {card.fights.map(fight => {
              const chatCount = (fightChat[`${card.id}_${fight.id}`] || []).length;
              return (
                <div key={fight.id} onClick={() => setFightChatModal(fight)} style={{ ...S.card, padding: "14px", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, letterSpacing: 0.5 }}>{fight.f1.name} vs {fight.f2.name}</div>
                      <div style={{ fontSize: 10, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 3 }}>{fight.type} · {fight.weight}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.cyan }}>💬 {chatCount}</span>
                      <span style={{ color: C.gray }}>›</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ height: 90 }} />
        <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
      </div>
    );
  }

    // ── SEARCH TAB ────────────────────────────────────────────────
  if (activeTab === "search") {
    const q = searchQ.trim();
    const results = q ? allVideosList.filter(v => fuzzyMatch(v.title, q) || fuzzyMatch(v.discipline, q) || fuzzyMatch(v.section, q)) : [];
    return (
      <div style={S.app}>
        <div style={S.header}>
          <div style={{ fontSize: 20, letterSpacing: 3 }}>🔍 <span style={{ color: C.pink }}>SEARCH</span></div>
          <div style={S.avatar} onClick={() => setActiveTab("profile")}>{user.name[0].toUpperCase()}</div>
        </div>
        <div style={{ padding: "14px 20px 0" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
            <input style={{ ...S.input, paddingLeft: 42, marginBottom: 0, borderColor: searchQ ? C.pink : "rgba(255,255,255,0.12)", borderWidth: 2 }} placeholder="Search moves, categories..." value={searchQ} onChange={e => setSearchQ(e.target.value)} autoFocus />
            {searchQ && <button onClick={() => setSearchQ("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.1)", border: "none", color: C.white, borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 13 }}>✕</button>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, overflowX: "auto", paddingBottom: 4 }}>
            {["Boxing","Kickboxing","Muay Thai","BJJ","Wrestling","Judo","Submissions","Takedowns"].map(tag => (
              <div key={tag} onClick={() => setSearchQ(tag)} style={{ flex: "0 0 auto", padding: "5px 14px", borderRadius: 20, background: searchQ === tag ? C.pink : "rgba(255,255,255,0.06)", color: searchQ === tag ? C.white : C.gray, fontSize: 12, fontFamily: "Arial, sans-serif", cursor: "pointer", letterSpacing: 1 }}>{tag}</div>
            ))}
          </div>
        </div>
        <div style={{ padding: "16px 20px" }}>
          {q === "" ? (
            <div style={{ textAlign: "center", padding: "50px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>🥋</div>
              <div style={{ fontSize: 20, letterSpacing: 3 }}>FIND ANY TECHNIQUE</div>
              <div style={{ fontSize: 13, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 8 }}>Search by name, category or discipline</div>
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>🤷</div>
              <div style={{ fontSize: 20, letterSpacing: 3 }}>NO RESULTS</div>
              <div style={{ fontSize: 13, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 8, marginBottom: 20 }}>No moves match "{searchQ}"</div>
              <button style={{ ...S.btnPink, width: "auto", padding: "12px 28px", display: "inline-block" }} onClick={() => { setActiveTab("bounty"); setSearchQ(""); }}>💰 REQUEST THIS MOVE</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: C.gray, letterSpacing: 2, marginBottom: 12 }}>{results.length} RESULT{results.length !== 1 ? "S" : ""}</div>
              {results.map((v, i) => {
                const col = catColor(v.discipline);
                const thumb = getYTThumb(v.youtubeUrl);
                const locked = !isPro && v.sectionIndex >= 5;
                return (
                  <div key={i} style={{ ...S.card, border: `1px solid ${col}22` }}>
                    <div style={{ display: "flex", gap: 0 }}>
                      <div onClick={() => locked ? setShowPaywall(true) : v.youtubeUrl ? window.open(v.youtubeUrl, "_blank") : null} style={{ width: 100, flexShrink: 0, background: thumb ? `url(${thumb}) center/cover no-repeat` : `linear-gradient(135deg,rgba(255,20,147,0.2),rgba(0,207,255,0.15),#111)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", cursor: "pointer", borderRadius: "14px 0 0 14px", filter: locked ? "blur(3px) grayscale(0.5)" : "none" }}>
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", borderRadius: "14px 0 0 14px" }} />
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: v.youtubeUrl ? "rgba(255,20,147,0.9)" : "rgba(80,80,80,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, position: "relative", zIndex: 1 }}>{locked ? "🔒" : "▶"}</div>
                      </div>
                      <div style={{ flex: 1, padding: "12px 14px" }}>
                        <div style={{ fontSize: 14, letterSpacing: 1, lineHeight: 1.3, marginBottom: 6 }}>{v.title}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ background: `${col}22`, color: col, borderRadius: 8, padding: "2px 8px", fontSize: 10, fontFamily: "Arial, sans-serif" }}>{v.discipline.toUpperCase()}</span>
                          <span style={{ background: "rgba(255,255,255,0.06)", color: C.gray, borderRadius: 8, padding: "2px 8px", fontSize: 10, fontFamily: "Arial, sans-serif" }}>{v.section}</span>
                        </div>
                        <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 6 }}>{locked ? <span style={{ color: C.gold }}>🔒 Pro members only</span> : <>{v.by}{v.youtubeUrl && <span style={{ color: C.pink }}> · ▶ Watch</span>}</>}</div>
                      </div>
                      <button onClick={() => locked ? setShowPaywall(true) : toggleFav(v, v.discipline, v.side, v.section)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: "14px 12px 14px 0", alignSelf: "center" }}>{locked ? "🔒" : isFav(v.title) ? "❤️" : "🤍"}</button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
        <div style={{ height: 80 }} />
        <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
      </div>
    );
  }

  // ── TECHNIQUE REQUEST CENTER ──────────────────────────────────
  if (activeTab === "bounty") {
    return (
      <div style={S.app}>
        <div style={S.header}>
          <div style={{ fontSize: 18, letterSpacing: 3 }}>🎯 <span style={{ color: C.gold }}>TECHNIQUE</span> REQUESTS</div>
          <div style={S.avatar} onClick={() => setActiveTab("profile")}>{user.name[0].toUpperCase()}</div>
        </div>

        {/* Request a Technique */}
        <div style={{ padding: "16px 20px 0" }}>
          <div style={{ background: `linear-gradient(135deg,rgba(255,215,0,0.12),rgba(255,215,0,0.04))`, border: `1px solid ${C.gold}44`, borderRadius: 16, padding: "20px", marginBottom: 16 }}>
            <div style={{ fontSize: 20, letterSpacing: 3, color: C.gold, marginBottom: 6 }}>🎯 REQUEST A TECHNIQUE</div>
            <div style={{ fontSize: 13, fontFamily: "Arial, sans-serif", color: "rgba(255,255,255,0.75)", lineHeight: 1.7, marginBottom: 14 }}>
              Can't find a technique or drill? Request it for <span style={{ color: C.gold }}>$1.49</span> and The MMA Manual team will upload it within <span style={{ color: C.green }}>3 business days</span> — guaranteed!
            </div>
            <button style={{ ...S.btnPink, background: `linear-gradient(135deg,${C.gold},#CC8800)`, color: "#000", fontSize: 15 }} onClick={() => setBountyModal(true)}>
              🎯 SUBMIT REQUEST — $1.49
            </button>
          </div>

          {/* Upload a Video */}
          <div style={{ background: "rgba(0,207,255,0.06)", border: `1px solid ${C.cyan}33`, borderRadius: 16, padding: "20px", marginBottom: 16 }}>
            <div style={{ fontSize: 20, letterSpacing: 3, color: C.cyan, marginBottom: 6 }}>📹 UPLOAD A VIDEO</div>
            <div style={{ fontSize: 13, fontFamily: "Arial, sans-serif", color: "rgba(255,255,255,0.75)", lineHeight: 1.7, marginBottom: 14 }}>
              Have a technique or drill you want to share? Upload it and it may be added to the app library!
            </div>
            <button style={{ ...S.btnCyan, fontSize: 15 }} onClick={() => setUploadModal(true)}>
              📹 UPLOAD A VIDEO
            </button>
          </div>

          {/* Open requests */}
          {bounties.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, letterSpacing: 3, marginBottom: 12 }}>RECENT REQUESTS</div>
              {bounties.slice(-5).reverse().map(b => (
                <div key={b.id} style={{ ...S.card, padding: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, letterSpacing: 1 }}>{b.move}</div>
                      <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 3 }}>{b.discipline?.toUpperCase()} · {b.date}</div>
                    </div>
                    <div style={{ background: b.status === "fulfilled" ? `${C.green}22` : `${C.gold}22`, border: `1px solid ${b.status === "fulfilled" ? C.green : C.gold}55`, borderRadius: 20, padding: "4px 10px", fontSize: 11, color: b.status === "fulfilled" ? C.green : C.gold, fontFamily: "Arial, sans-serif" }}>
                      {b.status === "fulfilled" ? "✅ LIVE" : "⏳ PENDING"}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ height: 90 }} />
        <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />

        {bountyModal && (
          <div style={S.modal}>
            <div style={S.modalBox}>
              <div style={{ fontSize: 20, letterSpacing: 3, color: C.gold, marginBottom: 4 }}>🎯 REQUEST A TECHNIQUE</div>
              <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: C.gray, marginBottom: 16, lineHeight: 1.6 }}>
                We'll upload it within <span style={{ color: C.gold }}>3 business days</span> — guaranteed!
              </div>
              <input style={S.input} placeholder="Technique or Drill Name *" value={bountyForm.move} onChange={e => setBountyForm({ ...bountyForm, move: e.target.value })} />
              <select style={S.input} value={bountyForm.discipline} onChange={e => setBountyForm({ ...bountyForm, discipline: e.target.value })}>
                {["boxing","kickboxing","muaythai","mma_stand","bjj","wrestling","judo","mma_ground"].map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
              </select>
              <input style={S.input} placeholder="Additional details (optional)" />
              <div style={{ background: `rgba(255,215,0,0.08)`, border: `1px solid ${C.gold}44`, borderRadius: 12, padding: "12px", marginBottom: 16, textAlign: "center" }}>
                <div style={{ fontSize: 26, color: C.gold }}>$1.49</div>
                <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 2 }}>Uploaded within 3 business days · Guaranteed</div>
              </div>
              <button style={{ ...S.btnPink, background: bountyForm.move.trim() ? `linear-gradient(135deg,${C.gold},#CC8800)` : "rgba(255,255,255,0.1)", color: bountyForm.move.trim() ? "#000" : C.gray, fontSize: 15 }}
                onClick={() => {
                  if (bountyForm.move.trim()) {
                    setBounties(prev => [...prev, { id: Date.now(), move: bountyForm.move, discipline: bountyForm.discipline, requestedBy: "@" + user.name.toLowerCase(), status: "open", date: "Just now" }]);
                    setBountyModal(false);
                    setBountyForm({ move: "", discipline: "bjj", side: "offense", section: "" });
                  }
                }}>
                SUBMIT REQUEST — PAY $1.49
              </button>
              <button style={S.btnCyan} onClick={() => setBountyModal(false)}>CANCEL</button>
            </div>
          </div>
        )}
      </div>
    );
  }

    // ── RANKS TAB ─────────────────────────────────────────────────
  if (activeTab === "ranks") {
    return (
      <div style={S.app}>
        <div style={S.header}>
          <button style={S.backBtn} onClick={() => setActiveTab("home")}>🏠</button>
          <div style={{ fontSize: 20, letterSpacing: 3 }}>🏆 <span style={{ color: C.gold }}>TOP</span> UPLOADERS</div>
          <div style={S.avatar} onClick={() => setActiveTab("profile")}>{user.name[0].toUpperCase()}</div>
        </div>
        <div style={{ background: `radial-gradient(ellipse at 50% 0%,rgba(255,215,0,0.15) 0%,transparent 70%)`, padding: "22px 20px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ textAlign: "center", fontSize: 12, letterSpacing: 4, color: C.gray, fontFamily: "Arial, sans-serif", marginBottom: 20 }}>MONTHLY RANKINGS</div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12 }}>
            {[{i:1,h:60,color:"#C0C0C0",sz:54,emoji:"🥈"},{i:0,h:80,color:C.gold,sz:66,emoji:"🥇"},{i:2,h:44,color:"#CD7F32",sz:48,emoji:"🥉"}].map(({i,h,color,sz,emoji}) => (
              <div key={i} style={{ textAlign: "center", flex: 1 }}>
                <div style={{ width: sz, height: sz, borderRadius: "50%", background: `linear-gradient(135deg,${color},${color}88)`, margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: sz*0.35, fontWeight: "bold", border: `2px solid ${color}`, boxShadow: `0 0 16px ${color}66` }}>{TOP_UPLOADERS[i].avatar}</div>
                <div style={{ fontSize: 12, letterSpacing: 2 }}>{TOP_UPLOADERS[i].name.split(" ")[0].toUpperCase()}</div>
                <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray }}>{TOP_UPLOADERS[i].uploads} uploads</div>
                <div style={{ background: color, height: h, borderRadius: "8px 8px 0 0", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{emoji}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "14px 20px" }}>
          {TOP_UPLOADERS.map((u, i) => (
            <div key={u.rank} style={{ ...S.card, border: i === 0 ? `1px solid ${C.gold}66` : `1px solid ${C.border}`, background: i === 0 ? `linear-gradient(135deg,rgba(255,215,0,0.08),${C.card})` : C.card }}>
              <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 20, width: 28, textAlign: "center" }}>{u.badge}</div>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: i === 0 ? `linear-gradient(135deg,${C.gold},#CC8800)` : i === 1 ? "linear-gradient(135deg,#C0C0C0,#888)" : i === 2 ? "linear-gradient(135deg,#CD7F32,#8B4513)" : `linear-gradient(135deg,${C.pink},${C.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: "bold" }}>{u.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, letterSpacing: 2, color: i === 0 ? C.gold : C.white }}>{u.name.toUpperCase()}</div>
                  <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: C.gray }}>{u.username}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, color: C.green }}>${u.earned}</div>
                  <div style={{ fontSize: 10, fontFamily: "Arial, sans-serif", color: C.gray }}>{u.uploads} moves</div>
                </div>
              </div>
              <div style={{ padding: "0 16px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray }}>🔥 {u.streak}wk streak</div>
                <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${Math.min(u.streak * 8, 100)}%`, background: `linear-gradient(90deg,${C.pink},${C.cyan})`, borderRadius: 2 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 80 }} />
        <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
      </div>
    );
  }

  // ── PROFILE TAB ───────────────────────────────────────────────
  if (activeTab === "profile") {
    return (
      <div style={S.app}>
        <div style={S.header}>
          <div style={{ fontSize: 20, letterSpacing: 3 }}>MY <span style={{ color: C.pink }}>PROFILE</span></div>
          <div style={S.avatar}>{user.name[0].toUpperCase()}</div>
        </div>
        <div style={{ background: `linear-gradient(135deg,rgba(255,20,147,0.12),rgba(0,207,255,0.08))`, border: `1px solid rgba(255,20,147,0.3)`, borderRadius: 16, margin: "20px", padding: "22px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg,${C.pink},${C.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: "bold", flexShrink: 0 }}>{user.name[0].toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 22, letterSpacing: 2 }}>{user.name.toUpperCase()}</div>
            <div style={{ fontSize: 14, fontFamily: "Arial, sans-serif", color: C.cyan, marginTop: 2 }}>{user.username}</div>
            {/* Pick reputation badge */}
            {pickHistory.length > 0 && (() => {
              const allP = pickHistory.flatMap(h => h.picks);
              const correct = allP.filter(p => p.correct).length;
              const acc = Math.round((correct / allP.length) * 100);
              const [icon, title, col] = acc >= 80 ? ["🏆","CHAMPION","#FFD700"] : acc >= 65 ? ["🥋","CONTENDER",C.cyan] : acc >= 50 ? ["🥊","FIGHTER",C.pink] : ["🩸","ROOKIE","#FF4444"];
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <div style={{ background: `${col}22`, border: `1px solid ${col}55`, borderRadius: 20, padding: "4px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 16 }}>{icon}</span>
                    <span style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: col, letterSpacing: 2 }}>{title}</span>
                  </div>
                  <span style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray }}>{correct}W-{allP.length - correct}L · {acc}%</span>
                </div>
              );
            })()}
            {pickHistory.length === 0 && (
              <div style={{ marginTop: 8, background: "rgba(136,136,136,0.15)", border: "1px solid rgba(136,136,136,0.3)", borderRadius: 20, padding: "4px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>🎯</span>
                <span style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, letterSpacing: 2 }}>UNRANKED</span>
              </div>
            )}
            <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: C.gray, background: "rgba(255,255,255,0.06)", borderRadius: 10, display: "inline-block", padding: "2px 10px", marginTop: 6 }}>{isPro ? "✓ PRO MEMBER" : user.plan}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, padding: "0 20px 20px" }}>
          {[["0","UPLOADS",C.pink],["$0","EARNED",C.green],[favourites.length+"","SAVED",C.cyan],[Object.values(ufcPicks).filter(Boolean).length+"","UFC PICKS","#CC0000"]].map(([num,lbl,col],i) => (
            <div key={i} style={{ flex: 1, background: C.card, borderRadius: 12, padding: "12px 8px", textAlign: "center", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 24, color: col }}>{num}</div>
              <div style={{ fontSize: 9, fontFamily: "Arial, sans-serif", color: C.gray, letterSpacing: 1 }}>{lbl}</div>
            </div>
          ))}
        </div>
        {!isPro && (
          <div style={{ margin: "0 20px 20px" }}>
            <div onClick={() => setShowPaywall(true)} style={{ background: `linear-gradient(135deg,rgba(255,215,0,0.15),rgba(255,215,0,0.05))`, border: `1px solid ${C.gold}55`, borderRadius: 14, padding: "16px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, letterSpacing: 3, color: C.gold }}>⚡ UPGRADE TO PRO</div>
                <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: C.gray, marginTop: 3 }}>Unlock everything · $1.99/mo</div>
              </div>
              <div style={{ color: C.gold, fontSize: 22 }}>›</div>
            </div>
          </div>
        )}
        <div style={{ margin: "0 20px 12px", fontSize: 12, letterSpacing: 3, color: C.gray, fontFamily: "Arial, sans-serif" }}>ACCOUNT</div>
        {[["⚙️","Settings"],["📹","My Uploads"],["❤️","Saved Moves"],["🔒","Privacy & Security"],["🚪","Sign Out"]].map(([icon,label],i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "Arial, sans-serif", fontSize: 15, color: label === "Sign Out" ? C.pink : C.white }}
            onClick={() => { if (label === "Sign Out") setUser(null); }}>
            <span>{icon} {label}</span>
            {label !== "Sign Out" && <span style={{ color: C.gray }}>›</span>}
          </div>
        ))}
        <div style={{ height: 80 }} />
        <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
      </div>
    );
  }

  // ── HOME ──────────────────────────────────────────────────────
  return (
    <div style={S.app}>
      <div style={S.header}>
        <div style={{ fontSize: 20, letterSpacing: 3 }}>THE <span style={{ color: C.pink }}>MMA</span> MANUAL</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!isPro && <div onClick={() => setShowPaywall(true)} style={{ background: `linear-gradient(135deg,${C.gold},#CC8800)`, borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "#000", fontFamily: "Arial, sans-serif", fontWeight: "bold", cursor: "pointer", letterSpacing: 1 }}>⚡ GO PRO</div>}
          {isPro  && <div style={{ background: `${C.green}22`, border: `1px solid ${C.green}44`, borderRadius: 20, padding: "4px 12px", fontSize: 11, color: C.green, fontFamily: "Arial, sans-serif" }}>✓ PRO</div>}
          <div style={S.avatar} onClick={() => setActiveTab("profile")}>{user.name[0].toUpperCase()}</div>
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      <div style={{ padding: "12px 16px 0", position: "relative", zIndex: 50 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#999", pointerEvents: "none", zIndex: 2 }}>🔍</span>
          <input
            style={{ width: "100%", background: "#FFFFFF", border: `2px solid ${searchQ ? C.pink : "rgba(0,0,0,0.12)"}`, borderRadius: 12, padding: "13px 40px 13px 42px", color: "#111111", fontSize: 15, fontFamily: "Arial, sans-serif", outline: "none", boxSizing: "border-box", boxShadow: searchQ ? `0 4px 20px rgba(255,20,147,0.2)` : "0 2px 10px rgba(0,0,0,0.15)", transition: "border-color 0.2s, box-shadow 0.2s" }}
            placeholder="Search any technique — skip the categories..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
          />
          {searchQ && (
            <button onClick={() => setSearchQ("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.1)", border: "none", color: "#555", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>✕</button>
          )}
        </div>

        {/* Live dropdown results — fuzzy, word-order independent, across every category */}
        {searchQ.trim().length > 0 && (() => {
          const results = allVideosList.filter(v => fuzzyMatch(v.title, searchQ)).slice(0, 8);
          const totalMatches = allVideosList.filter(v => fuzzyMatch(v.title, searchQ)).length;
          const disciplineLabel = { boxing: "Boxing", kickboxing: "Kickboxing", muaythai: "Muay Thai", mma_stand: "MMA Standup", bjj: "BJJ", wrestling: "Wrestling", judo: "Judo", mma_ground: "MMA Ground", grappling_arts: "Grappling Arts", striking_arts: "Striking Arts", all_arts: "All The Arts", mma_drills: "MMA Drills", striking_drills: "Striking Drills", grappling_drills: "Grappling Drills", ufc_fighters: "UFC Fighter Techniques" };
          return (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 16, right: 16, background: "#FFFFFF", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", overflow: "hidden", zIndex: 100, border: "1px solid rgba(0,0,0,0.1)" }}>
              {results.length === 0 ? (
                <div style={{ padding: "16px 18px", fontFamily: "Arial, sans-serif", color: "#666", fontSize: 14 }}>
                  No results for "<strong>{searchQ}</strong>" — try a different keyword
                </div>
              ) : (
                <>
                  <div style={{ padding: "10px 16px 6px", fontSize: 10, fontFamily: "Arial, sans-serif", color: "#999", letterSpacing: 2, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                    {totalMatches} RESULT{totalMatches !== 1 ? "S" : ""}
                  </div>
                  {results.map((v, i) => {
                    const thumb = getYTThumb(v.youtubeUrl);
                    const isStriking = ["boxing","kickboxing","muaythai","mma_stand","striking_arts","striking_drills"].includes(v.discipline);
                    const tagColor = isStriking ? C.pink : v.discipline.includes("drill") ? "#9B5CFF" : C.cyan;
                    const locked = !isPro && v.sectionIndex >= 5;
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          if (locked) { setShowPaywall(true); setSearchQ(""); return; }
                          if (v.youtubeUrl) window.open(v.youtubeUrl, "_blank");
                          setSearchQ("");
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: i < results.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", cursor: "pointer", background: "#fff", transition: "background 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f9f9f9"}
                        onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                      >
                        {/* Thumbnail or icon */}
                        <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, background: thumb ? `url(${thumb}) center/cover no-repeat` : `linear-gradient(135deg,${tagColor}33,${tagColor}11)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, overflow: "hidden", filter: locked ? "grayscale(0.6) brightness(0.7)" : "none" }}>
                          {!thumb && (locked ? "🔒" : "▶")}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontFamily: "Arial, sans-serif", color: "#111", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.title}</div>
                          <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: "#888", marginTop: 2 }}>
                            <span style={{ background: `${tagColor}22`, color: tagColor, borderRadius: 6, padding: "1px 7px", marginRight: 6, fontSize: 10 }}>{disciplineLabel[v.discipline] || v.discipline}</span>
                            {v.section}
                          </div>
                        </div>
                        {locked ? <span style={{ fontSize: 9, fontFamily: "Arial, sans-serif", color: "#999", letterSpacing: 1, flexShrink: 0 }}>🔒 PRO</span> : v.youtubeUrl && <span style={{ fontSize: 18, flexShrink: 0 }}>▶</span>}
                      </div>
                    );
                  })}
                  {totalMatches > 8 && (
                    <div onClick={() => { setActiveTab("search"); }} style={{ padding: "12px 16px", fontFamily: "Arial, sans-serif", fontSize: 13, color: C.pink, cursor: "pointer", textAlign: "center", borderTop: "1px solid rgba(0,0,0,0.06)", fontWeight: "bold" }}>
                      See all {totalMatches} results →
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}
      </div>
      <div style={{ background: `radial-gradient(ellipse at 50% 0%,rgba(255,20,147,0.2) 0%,transparent 70%)`, padding: "20px 20px 16px", textAlign: "center", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 13, fontFamily: "Arial, sans-serif", color: C.gray, letterSpacing: 2 }}>WELCOME BACK</div>
        <div style={{ fontSize: 30, letterSpacing: 4 }}>{user.name.toUpperCase()}</div>
        <div style={{ display: "inline-block", background: `linear-gradient(135deg,${C.pink}22,${C.cyan}22)`, border: `1px solid ${C.cyan}55`, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontFamily: "Arial, sans-serif", color: C.cyan, letterSpacing: 1, marginTop: 8 }}>🥋 MEMBER · THE MMA MANUAL</div>
      </div>

      {/* MMA Hub shortcut */}
      <div onClick={() => setActiveTab("community")} style={{ margin: "12px 20px 0", background: `linear-gradient(135deg,rgba(204,0,0,0.2),rgba(0,207,255,0.08))`, border: `1px solid rgba(204,0,0,0.35)`, borderRadius: 16, padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 20, letterSpacing: 3, color: "#FF4444" }}>🏟️ THE MMA HUB</div>
          <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: "rgba(255,255,255,0.65)", marginTop: 4 }}>Talk MMA here → Discussions · Bets · Odds · Groups</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 28 }}>💬</div>
          <div style={{ fontSize: 10, fontFamily: "Arial, sans-serif", color: "#FF4444", letterSpacing: 1 }}>ENTER →</div>
        </div>
      </div>

      {/* Main categories */}
      <div style={S.secLbl}>SELECT YOUR TRAINING CATEGORY</div>
      <div style={{ padding: "0 20px" }}>
        {/* STANDUP */}
        <div onClick={() => setSelCategory("standup")} style={{ background: DISCIPLINES.standup.gradient, border: `1px solid ${C.pink}55`, borderRadius: 16, padding: "22px", marginBottom: 14, cursor: "pointer", boxShadow: `0 4px 24px rgba(255,20,147,0.2)`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 32, letterSpacing: 4 }}>STANDUP</div>
            <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: "rgba(255,255,255,0.6)", marginTop: 5 }}>Boxing · Kickboxing · Muay Thai · MMA</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {DISCIPLINES.standup.subs.map(s => <span key={s.id} style={{ fontSize: 20 }}>{s.icon}</span>)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 48 }}>🥊</div>
            <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
              {DISCIPLINES.standup.subs.reduce((a,s) => a + Object.values(videos[s.id]||{}).reduce((b,sides) => b + Object.values(sides).reduce((c,v) => c+v.length,0),0),0)} videos
            </div>
          </div>
        </div>

        {/* GROUND */}
        <div onClick={() => setSelCategory("ground")} style={{ background: DISCIPLINES.ground.gradient, border: `1px solid ${C.cyan}55`, borderRadius: 16, padding: "22px", marginBottom: 14, cursor: "pointer", boxShadow: `0 4px 24px rgba(0,207,255,0.15)`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 32, letterSpacing: 4 }}>GROUND</div>
            <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: "rgba(255,255,255,0.6)", marginTop: 5 }}>BJJ · Wrestling · Judo · MMA</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {DISCIPLINES.ground.subs.map(s => <span key={s.id} style={{ fontSize: 20 }}>{s.icon}</span>)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 48 }}>🤼</div>
            <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
              {DISCIPLINES.ground.subs.reduce((a,s) => a + Object.values(videos[s.id]||{}).reduce((b,sides) => b + Object.values(sides).reduce((c,v) => c+v.length,0),0),0)} videos
            </div>
          </div>
        </div>

        {/* MMA TECHNIQUES */}
        <div onClick={() => setSelCategory("bestmma")} style={{ background: DISCIPLINES.bestmma.gradient, border: `1px solid ${C.gold}55`, borderRadius: 16, padding: "22px", marginBottom: 14, cursor: "pointer", boxShadow: `0 4px 24px rgba(255,215,0,0.15)`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, letterSpacing: 4 }}>MMA TECHNIQUES</div>
            <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: "rgba(255,255,255,0.6)", marginTop: 5 }}>Grappling Arts · Striking Arts · All The Arts</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {DISCIPLINES.bestmma.subs.map(s => <span key={s.id} style={{ fontSize: 20 }}>{s.icon}</span>)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 48 }}>🏅</div>
            <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
              {DISCIPLINES.bestmma.subs.reduce((a,s) => a + Object.values(videos[s.id]||{}).reduce((b,sides) => b + Object.values(sides).reduce((c,v) => c+v.length,0),0),0)} videos
            </div>
          </div>
        </div>

        {/* DRILLS */}
        <div onClick={() => setSelCategory("drills")} style={{ background: DISCIPLINES.drills.gradient, border: `1px solid #9B5CFF55`, borderRadius: 16, padding: "22px", marginBottom: 14, cursor: "pointer", boxShadow: `0 4px 24px rgba(155,92,255,0.18)`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 30, letterSpacing: 4 }}>DRILLS</div>
            <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: "rgba(255,255,255,0.6)", marginTop: 5 }}>MMA Drills · Striking Drills · Grappling Drills</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {DISCIPLINES.drills.subs.map(s => <span key={s.id} style={{ fontSize: 20 }}>{s.icon}</span>)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 48 }}>🧩</div>
            <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
              {DISCIPLINES.drills.subs.reduce((a,s) => a + Object.values(videos[s.id]||{}).reduce((b,sides) => b + Object.values(sides).reduce((c,v) => c+v.length,0),0),0)} videos
            </div>
          </div>
        </div>

        {/* UFC & BJJ FIGHTERS */}
        <div onClick={() => setSelCategory("fighters")} style={{ background: DISCIPLINES.fighters.gradient, border: `1px solid rgba(204,0,0,0.4)`, borderRadius: 16, padding: "22px", marginBottom: 14, cursor: "pointer", boxShadow: `0 4px 24px rgba(204,0,0,0.2)`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 30, letterSpacing: 4 }}>UFC & BJJ FIGHTERS</div>
            <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: "rgba(255,255,255,0.6)", marginTop: 5 }}>UFC Fighters · BJJ Fighters · Boxers</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {DISCIPLINES.fighters.subs.map(s => <span key={s.id} style={{ fontSize: 20 }}>{s.icon}</span>)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 48 }}>🌟</div>
            <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
              {[...DISCIPLINES.fighters.subs].map(s => Object.values(videos[s.id]?.offense || {}).map(a => a.length).reduce((x,y)=>x+y,0)).reduce((x,y)=>x+y,0)} videos
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 90 }} />
      <BottomNav active={activeTab} setActive={setActiveTab} onReset={resetNav} />
    </div>
  );
}
