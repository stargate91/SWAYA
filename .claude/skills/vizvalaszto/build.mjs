#!/usr/bin/env node
// build.mjs — the /vizvalaszto generator (zero-dep, no build step).
// Reads a Court-of-Experts JSON ({ intro, questions[] }) and emits one
// self-contained vizvalaszto.html: data baked inline, opens from file://,
// autosaves answers to localStorage, Save -> .md export.
//
//   node wex/skills/vizvalaszto/build.mjs [inputJson] [outputHtml] [seedJson]
//
// Defaults: .interim/vizvalaszto-court.json -> vizvalaszto.html, seed from
// .interim/vizvalaszto-seed.json if it exists (carries already-answered Qs).
// This is the reference implementation the SKILL.md points at.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const inPath = process.argv[2] || '.interim/vizvalaszto-court.json';
const outPath = process.argv[3] || 'vizvalaszto.html';
const seedPath = process.argv[4] || '.interim/vizvalaszto-seed.json';

const data = JSON.parse(readFileSync(inPath, 'utf8'));
if (!data || !Array.isArray(data.questions) || !data.intro) {
  console.error('FATAL: input must be { intro:{...}, questions:[...] } — got', Object.keys(data || {}));
  process.exit(1);
}
let seed = {};
if (existsSync(seedPath)) {
  try { seed = JSON.parse(readFileSync(seedPath, 'utf8')) || {}; }
  catch (e) { console.error('WARN: could not parse seed', seedPath, '-', e.message); }
}

// --- The Court (vertical -> persona/look). Names MUST match question.vertical exactly. ---
const VERTICALS = [
  { name: 'Product Vision & North Star', persona: 'The Visionary', emoji: '\u{1F52E}', accent: '#6b54e6',
    blurb: 'Guards the north star and the lines you must never cross — what Conflux should become, and what it must never become.' },
  { name: 'Developer Experience & Onboarding', persona: 'The Craftsman', emoji: '\u{1F6E0}️', accent: '#0e9bb0',
    blurb: 'Owns the first five minutes — the start-here page, the on-ramp, and what “just works” really costs.' },
  { name: 'AI / Agentic Architecture & Tokenomics', persona: 'The Engineer', emoji: '⚙️', accent: '#d9732e',
    blurb: 'Holds the build loop, the verify gate, which model does what, and the zero-install promise.' },
  { name: 'Distribution, Community & Open-Source GTM', persona: 'The Herald', emoji: '\u{1F4E3}', accent: '#18915f',
    blurb: 'Watches how people find it, the licence, the shareable moment, and the first community.' },
  { name: 'Business Model & Sustainability', persona: 'The Steward', emoji: '\u{1F3DB}️', accent: '#b6881a',
    blurb: 'Weighs what you actually sell once cheap reading is everywhere, and who pays the rent.' },
  { name: 'Brand, Narrative & Design', persona: 'The Loremaster', emoji: '\u{1F4DC}', accent: '#c93f96',
    blurb: 'Tends the names, the story, and the feeling Conflux gives a builder at 2am.' },
];

const known = new Set(VERTICALS.map(v => v.name));
for (const q of data.questions) {
  if (!known.has(q.vertical)) {
    console.error('FATAL: question', q.id, 'has unknown vertical:', JSON.stringify(q.vertical));
    process.exit(1);
  }
}

const payload = { intro: data.intro, questions: data.questions, verticals: VERTICALS };
const json = JSON.stringify(payload).replace(/</g, '\\u003c');
const seedJson = JSON.stringify(seed).replace(/</g, '\\u003c');

const STYLE = `
:root{
  --bg:#f3f4fb; --card:#ffffff; --raised:#fbfbff;
  --ink:#191c2e; --muted:#565b78; --faint:#8a8fa8; --line:#e6e7f1; --line2:#eef0f7;
  --violet:#6b54e6; --cyan:#0e9bb0; --ember:#d9732e;
  --accent:var(--violet);
  --maxw:1200px;
  --font:'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  --serif:'Iowan Old Style','Palatino Linotype',Georgia,serif;
  --shadow:0 1px 2px rgba(22,24,55,.04),0 10px 30px -20px rgba(22,24,55,.22);
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{
  background:
    radial-gradient(1100px 620px at 8% -10%, rgba(107,84,230,.10), transparent 60%),
    radial-gradient(900px 560px at 104% 0%, rgba(14,155,176,.09), transparent 55%),
    radial-gradient(900px 700px at 50% 128%, rgba(217,115,46,.06), transparent 60%),
    var(--bg);
  color:var(--ink); font-family:var(--font); font-size:17px; line-height:1.62;
  -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
}
a{color:var(--cyan);text-decoration:none}
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 26px}

/* header */
header.bar{position:sticky;top:0;z-index:40;backdrop-filter:blur(12px) saturate(1.2);
  background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(255,255,255,.74));border-bottom:1px solid var(--line)}
.bar-in{display:flex;align-items:center;gap:18px;height:66px;max-width:var(--maxw);margin:0 auto;padding:0 26px}
.brand{display:flex;align-items:center;gap:11px;font-weight:650;font-size:17px;white-space:nowrap;color:var(--ink)}
.brand .glyph{width:25px;height:25px;border-radius:7px;background:
  conic-gradient(from 210deg,var(--violet),var(--cyan),var(--ember),var(--violet));
  box-shadow:0 0 16px -4px var(--violet);flex:0 0 auto}
.brand b{font-weight:760}
.brand .sep{color:var(--faint);font-weight:400}
.brand .vv{color:var(--violet);font-weight:680}
.bar-spacer{flex:1}
.bar-prog{display:flex;align-items:center;gap:11px;min-width:0}
.bar-prog .track{width:140px;height:8px;border-radius:99px;background:#e7e8f3;overflow:hidden}
.bar-prog .fill{height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,var(--violet),var(--cyan));transition:width .35s ease}
.bar-prog .count{font-variant-numeric:tabular-nums;font-size:14px;color:var(--muted);white-space:nowrap;font-weight:600}
.btn{font:inherit;font-weight:640;font-size:15px;color:var(--ink);background:#fff;
  border:1px solid var(--line);padding:10px 17px;border-radius:12px;cursor:pointer;transition:.15s;white-space:nowrap;box-shadow:var(--shadow)}
.btn:hover{border-color:#cfd1e6;transform:translateY(-1px)}
.btn.primary{background:linear-gradient(180deg,var(--violet),#5a44d6);border-color:transparent;color:#fff;
  box-shadow:0 10px 26px -12px var(--violet)}
.btn.primary:hover{box-shadow:0 14px 32px -12px var(--violet)}
.btn.ghost{background:transparent;box-shadow:none}
.btn.small{padding:7px 14px;font-size:14px;border-radius:10px}
.link{background:none;border:none;color:var(--muted);font:inherit;font-size:15px;cursor:pointer;padding:0}
.link:hover{color:var(--ink)}
.saved-pulse{font-size:13px;color:var(--cyan);opacity:0;transition:opacity .2s;font-weight:600}
.saved-pulse.show{opacity:1}

/* intro */
#view-intro{padding:58px 0 96px}
#view-intro .wrap{max-width:1000px}
.kicker{display:inline-flex;align-items:center;gap:9px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--muted);border:1px solid var(--line);padding:7px 15px;border-radius:99px;background:#fff;box-shadow:var(--shadow)}
h1.title{font-size:clamp(42px,7vw,72px);line-height:1.02;margin:24px 0 8px;font-weight:780;letter-spacing:-1.6px;color:var(--ink)}
h1.title .grad{background:linear-gradient(110deg,var(--violet),var(--cyan) 58%,var(--ember));
  -webkit-background-clip:text;background-clip:text;color:transparent}
.subtitle{font-family:var(--serif);font-size:clamp(20px,2.6vw,25px);color:#3a3e57;max-width:780px;font-style:italic;margin:0}
.lede{color:var(--muted);max-width:760px;margin:18px 0 0;font-size:18px}
.understand{display:grid;gap:18px;margin:46px 0 8px}
.ucard{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:26px 28px;position:relative;overflow:hidden;box-shadow:var(--shadow)}
.ucard::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--accent)}
.ucard h2{margin:0 0 9px;font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);font-weight:700}
.ucard p{margin:0;color:#33384f;font-size:17px;line-height:1.66}
.section-label{display:flex;align-items:center;gap:16px;margin:64px 0 24px}
.section-label .ln{flex:1;height:1px;background:var(--line)}
.section-label span{font-size:14px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:600}
.court{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.judge{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px;display:flex;gap:15px;align-items:flex-start;transition:.18s;box-shadow:var(--shadow)}
.judge:hover{border-color:color-mix(in srgb,var(--accent) 50%,var(--line));transform:translateY(-2px)}
.judge .em{font-size:28px;line-height:1}
.judge .nm{font-weight:720;color:var(--ink);font-size:17px}
.judge .dom{font-size:13px;color:var(--accent);margin:2px 0 8px;font-weight:680}
.judge .bl{font-size:14.5px;color:var(--muted);margin:0;line-height:1.55}
.court-note{color:var(--muted);font-size:16px;max-width:820px;margin:24px 0 0;line-height:1.66}
.begin-row{margin:44px 0 0;display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.begin-row .btn.primary{font-size:17px;padding:15px 30px;border-radius:14px}
.begin-row .meta{color:var(--faint);font-size:14.5px}

/* questions layout */
#view-questions{display:none;padding:34px 0 150px}
.q-layout{display:grid;grid-template-columns:252px 1fr;gap:44px;align-items:start;max-width:var(--maxw);margin:0 auto;padding:0 26px}
nav.side{position:sticky;top:90px;display:flex;flex-direction:column;gap:5px}
nav.side .nav-title{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin:0 0 9px 11px;font-weight:600}
.nav-item{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:12px;cursor:pointer;border:1px solid transparent;transition:.15s;text-align:left;background:none;font:inherit;color:var(--muted);width:100%}
.nav-item:hover{background:#fff;color:var(--ink);box-shadow:var(--shadow)}
.nav-item.active{background:#fff;border-color:color-mix(in srgb,var(--accent) 36%,var(--line));color:var(--ink);box-shadow:var(--shadow)}
.nav-item .ne{font-size:17px}
.nav-item .nt{flex:1;font-size:14.5px;font-weight:620;line-height:1.2}
.nav-item .nc{font-size:12px;font-variant-numeric:tabular-nums;color:var(--muted);background:#eef0f7;padding:2px 8px;border-radius:99px;white-space:nowrap;font-weight:600}
.nav-item.done .nc{color:#fff;background:var(--accent)}
main.q-main{min-width:0}
.vsection{margin:0 0 52px;scroll-margin-top:90px}
.vhead{display:flex;align-items:center;gap:15px;margin:0 0 20px;padding:0 0 15px;border-bottom:1px solid var(--line)}
.vhead .vemoji{font-size:30px}
.vhead .vname{font-weight:760;font-size:22px;letter-spacing:-.3px}
.vhead .vpersona{font-size:14px;color:var(--accent);font-weight:680}

/* question card */
.card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:26px 28px 20px;margin:0 0 18px;
  transition:border-color .2s,box-shadow .2s;box-shadow:var(--shadow)}
.card.answered{border-color:color-mix(in srgb,var(--accent) 42%,var(--line))}
.card-top{display:flex;align-items:center;gap:11px;margin:0 0 13px}
.qnum{font-weight:780;font-size:13px;color:#fff;background:var(--accent);padding:4px 11px;border-radius:8px;font-variant-numeric:tabular-nums}
.qtag{font-size:13px;color:var(--accent);font-weight:680}
.qtext{margin:0 0 18px;font-size:21px;line-height:1.42;font-weight:680;letter-spacing:-.3px;color:var(--ink)}
.opts{display:flex;flex-direction:column;gap:11px}
.opt{display:flex;gap:14px;align-items:flex-start;padding:16px 17px;border:1.5px solid var(--line);border-radius:14px;
  cursor:pointer;background:var(--raised);transition:.14s;position:relative}
.opt:hover{border-color:#cfd1e6;background:#fff}
.opt.selected{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 7%,#fff);
  box-shadow:0 0 0 1px var(--accent),0 10px 26px -16px var(--accent)}
.opt-radio{position:absolute;opacity:0;pointer-events:none}
.dot{flex:0 0 auto;width:22px;height:22px;border-radius:50%;border:2px solid #c4c7dc;margin-top:2px;display:grid;place-items:center;transition:.14s}
.opt.selected .dot{border-color:var(--accent)}
.opt.selected .dot::after{content:'';width:10px;height:10px;border-radius:50%;background:var(--accent)}
.opt-body{display:flex;gap:10px;align-items:baseline;min-width:0;flex:1}
.opt-letter{font-weight:780;font-size:14px;color:var(--accent);flex:0 0 auto;width:15px}
.opt-text{font-size:16.5px;color:#2c3047;min-width:0;line-height:1.5}
.opt-c{align-items:center}
.opt-c .opt-body{flex-direction:column;align-items:stretch;gap:9px;width:100%}
.opt-c .c-head{display:flex;gap:10px;align-items:baseline}
.opt-c .c-lab{font-size:16.5px;color:#2c3047;font-weight:600}
.c-input{width:100%;font:inherit;font-size:16px;color:var(--ink);background:#fff;border:1.5px solid var(--line);
  border-radius:11px;padding:12px 14px;transition:.14s}
.c-input::placeholder{color:var(--faint)}
.c-input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent)}
details.note{margin:15px 0 2px;border-top:1px dashed var(--line);padding-top:13px}
details.note summary{cursor:pointer;font-size:14.5px;color:var(--muted);font-weight:640;list-style:none;display:inline-flex;align-items:center;gap:8px;user-select:none}
details.note summary::-webkit-details-marker{display:none}
details.note summary::before{content:'▸';color:var(--accent);transition:transform .15s;font-size:12px}
details.note[open] summary::before{transform:rotate(90deg)}
details.note summary:hover{color:var(--ink)}
.note-body{margin:11px 0 4px;font-size:15px;line-height:1.7;color:var(--muted);
  border-left:3px solid color-mix(in srgb,var(--accent) 45%,var(--line));padding-left:15px}

/* footer actions */
.q-foot{margin:54px 0 0;padding:34px;border:1px solid var(--line);border-radius:20px;background:var(--card);text-align:center;box-shadow:var(--shadow)}
.q-foot h3{margin:0 0 8px;font-size:23px;font-weight:760}
.q-foot p{margin:0 0 20px;color:var(--muted);font-size:16px;max-width:600px;margin-left:auto;margin-right:auto}
.q-foot .row{display:flex;gap:13px;justify-content:center;flex-wrap:wrap}

/* modal */
.modal-bg{position:fixed;inset:0;z-index:80;background:rgba(25,28,46,.42);backdrop-filter:blur(5px);display:none;align-items:center;justify-content:center;padding:24px}
.modal-bg.show{display:flex}
.modal{width:min(780px,100%);max-height:88vh;display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:22px;overflow:hidden;box-shadow:0 40px 100px -28px rgba(25,28,46,.5)}
.modal-h{display:flex;align-items:center;gap:12px;padding:22px 26px;border-bottom:1px solid var(--line)}
.modal-h h3{margin:0;font-size:19px;font-weight:760;flex:1}
.modal-h .count{font-size:14px;color:var(--muted);font-weight:600}
.modal-b{padding:22px 26px;overflow:auto}
.modal-b p.hint{margin:0 0 15px;color:var(--muted);font-size:15px;line-height:1.6}
.modal-b textarea{width:100%;height:300px;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:13px;line-height:1.55;color:#33384f;background:#f7f8fc;border:1px solid var(--line);border-radius:13px;padding:15px;resize:vertical}
.modal-f{display:flex;gap:13px;align-items:center;padding:18px 26px;border-top:1px solid var(--line)}
.modal-f .grow{flex:1;color:var(--faint);font-size:14px}

.foot-note{color:var(--faint);font-size:14px;text-align:center;margin:34px auto 0;max-width:560px}
.warn{margin:18px auto;max-width:var(--maxw);padding:14px 20px;border:1px solid #e3a857;background:#fdf3e3;border-radius:13px;color:#8a5a1c;font-size:15px}

@media (max-width:860px){
  body{font-size:16px}
  .court{grid-template-columns:1fr}
  .q-layout{grid-template-columns:1fr;gap:0}
  nav.side{display:none}
  .bar-prog .track{width:84px}
  .qtext{font-size:19px}
}
`;

// --- Client script. NOTE: no backticks and no dollar-brace inside this string. ---
const CLIENT_JS = `
'use strict';
var PAYLOAD = JSON.parse(document.getElementById('viz-data').textContent);
var Q = PAYLOAD.questions, V = PAYLOAD.verticals, TOTAL = Q.length;
var KEY = 'vizvalaszto:conflux', SKEY = 'vizvalaszto:conflux:started';
var SEED = {}; try { SEED = JSON.parse(document.getElementById('viz-seed').textContent) || {}; } catch (e) {}
var lsOK = true, lsAnswers = {};
try { lsAnswers = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { lsOK = false; }
var answers = Object.assign({}, SEED, lsAnswers); // saved answers win; seed fills the rest

function el(t, c, txt){ var e=document.createElement(t); if(c) e.className=c; if(txt!=null) e.textContent=txt; return e; }
function slug(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
function qFor(name){ return Q.filter(function(q){return q.vertical===name;}).sort(function(a,b){return a.id-b.id;}); }
function isAnswered(a){ return !!(a && a.choice && (a.choice!=='C' || (a.text && a.text.trim()))); }
function countAll(){ var n=0; Q.forEach(function(q){ if(isAnswered(answers[q.id])) n++; }); return n; }
function countFor(name){ var n=0; qFor(name).forEach(function(q){ if(isAnswered(answers[q.id])) n++; }); return n; }

function persist(){
  if(!lsOK) return;
  try { localStorage.setItem(KEY, JSON.stringify(answers)); pulse(); }
  catch(e){ lsOK=false; showWarn(); }
}
var pulseT=null;
function pulse(){ var p=document.getElementById('saved'); if(!p) return; p.classList.add('show');
  if(pulseT) clearTimeout(pulseT); pulseT=setTimeout(function(){p.classList.remove('show');},1100); }
function showWarn(){ var w=document.getElementById('lswarn'); if(w) w.style.display='block'; }

/* ---------- intro ---------- */
function renderIntro(){
  var I=PAYLOAD.intro;
  document.getElementById('u-is').textContent = I.whatItIs;
  document.getElementById('u-be').textContent = I.whatItBecomes;
  document.getElementById('u-wi').textContent = I.worldImpact;
  document.getElementById('court-note').textContent = I.courtSummary;
  var c=document.getElementById('court'); c.innerHTML='';
  V.forEach(function(v){
    var j=el('div','judge'); j.style.setProperty('--accent',v.accent);
    j.appendChild(el('div','em',v.emoji));
    var b=el('div','jbody');
    b.appendChild(el('div','nm',v.persona));
    b.appendChild(el('div','dom',v.name));
    b.appendChild(el('div','bl',v.blurb));
    j.appendChild(b); c.appendChild(j);
  });
}

/* ---------- questions ---------- */
function optRow(q,letter,text){
  var lab=el('label','opt'); lab.dataset.q=q.id; lab.dataset.choice=letter;
  var r=document.createElement('input'); r.type='radio'; r.className='opt-radio'; r.name='q'+q.id; r.value=letter; r.dataset.q=q.id;
  lab.appendChild(r);
  lab.appendChild(el('span','dot'));
  var body=el('span','opt-body');
  body.appendChild(el('span','opt-letter',letter));
  body.appendChild(el('span','opt-text',text));
  lab.appendChild(body);
  return lab;
}
function optRowC(q){
  var lab=el('label','opt opt-c'); lab.dataset.q=q.id; lab.dataset.choice='C';
  var r=document.createElement('input'); r.type='radio'; r.className='opt-radio'; r.name='q'+q.id; r.value='C'; r.dataset.q=q.id;
  lab.appendChild(r);
  lab.appendChild(el('span','dot'));
  var body=el('span','opt-body');
  var head=el('span','c-head');
  head.appendChild(el('span','opt-letter','C'));
  head.appendChild(el('span','c-lab','In my own words'));
  body.appendChild(head);
  var inp=document.createElement('input'); inp.type='text'; inp.className='c-input'; inp.placeholder='Type your own answer…'; inp.dataset.q=q.id;
  body.appendChild(inp);
  lab.appendChild(body);
  return lab;
}
function card(q,v){
  var a=el('article','card'); a.id='q-'+q.id; a.style.setProperty('--accent',v.accent);
  var top=el('div','card-top');
  top.appendChild(el('span','qnum','Q'+q.id));
  top.appendChild(el('span','qtag',v.persona));
  a.appendChild(top);
  a.appendChild(el('h3','qtext',q.question));
  var opts=el('div','opts');
  opts.appendChild(optRow(q,'A',q.optionA));
  opts.appendChild(optRow(q,'B',q.optionB));
  opts.appendChild(optRowC(q));
  a.appendChild(opts);
  var det=el('details','note');
  det.appendChild(el('summary',null,'Why this matters'));
  det.appendChild(el('p','note-body',q.note));
  a.appendChild(det);
  return a;
}
function renderQuestions(){
  var main=document.getElementById('q-main'); main.innerHTML='';
  V.forEach(function(v){
    var sec=el('section','vsection'); sec.id='sec-'+slug(v.name); sec.style.setProperty('--accent',v.accent);
    var h=el('div','vhead');
    h.appendChild(el('span','vemoji',v.emoji));
    var ht=el('div');
    ht.appendChild(el('div','vname',v.name));
    ht.appendChild(el('div','vpersona',v.persona));
    h.appendChild(ht); sec.appendChild(h);
    qFor(v.name).forEach(function(q){ sec.appendChild(card(q,v)); });
    main.appendChild(sec);
  });
  renderSide();
}
function renderSide(){
  var n=document.getElementById('side'); n.innerHTML='';
  n.appendChild(el('div','nav-title','The Court'));
  V.forEach(function(v){
    var b=el('button','nav-item'); b.dataset.target='sec-'+slug(v.name); b.style.setProperty('--accent',v.accent);
    b.appendChild(el('span','ne',v.emoji));
    b.appendChild(el('span','nt',v.persona));
    var c=el('span','nc'); c.id='nc-'+slug(v.name); b.appendChild(c);
    b.addEventListener('click',function(){ var t=document.getElementById(b.dataset.target); if(t) t.scrollIntoView({behavior:'smooth',block:'start'}); });
    n.appendChild(b);
  });
}

/* ---------- state apply ---------- */
function refreshCard(id){
  var labs=document.querySelectorAll('.opt[data-q="'+id+'"]');
  var a=answers[id];
  labs.forEach(function(l){
    var on = a && a.choice===l.dataset.choice;
    l.classList.toggle('selected',!!on);
    var r=l.querySelector('.opt-radio'); if(r) r.checked=!!on;
  });
  var cardEl=document.getElementById('q-'+id);
  if(cardEl) cardEl.classList.toggle('answered', isAnswered(a));
}
function selectChoice(id,choice){
  answers[id]=answers[id]||{}; answers[id].choice=choice;
  refreshCard(id); persist(); updateProgress();
}
function applySaved(){
  Q.forEach(function(q){
    var a=answers[q.id]; if(!a||!a.choice) return;
    if(a.choice==='C'){ var ci=document.querySelector('.c-input[data-q="'+q.id+'"]'); if(ci&&a.text!=null) ci.value=a.text; }
    refreshCard(q.id);
  });
}
function updateProgress(){
  var n=countAll();
  var pct=TOTAL?Math.round(n/TOTAL*100):0;
  document.getElementById('fill').style.width=pct+'%';
  document.getElementById('count').textContent=n+' / '+TOTAL;
  V.forEach(function(v){
    var c=document.getElementById('nc-'+slug(v.name)); if(!c) return;
    var done=countFor(v.name), tot=qFor(v.name).length;
    c.textContent=done+'/'+tot;
    var item=c.closest('.nav-item'); if(item) item.classList.toggle('done',done===tot&&tot>0);
  });
}

/* ---------- events ---------- */
document.addEventListener('change',function(e){
  if(e.target.classList&&e.target.classList.contains('opt-radio')){ selectChoice(+e.target.dataset.q,e.target.value); }
});
document.addEventListener('focusin',function(e){
  if(e.target.classList&&e.target.classList.contains('c-input')){
    var id=+e.target.dataset.q;
    if(!answers[id]||answers[id].choice!=='C') selectChoice(id,'C');
  }
});
document.addEventListener('input',function(e){
  if(e.target.classList&&e.target.classList.contains('c-input')){
    var id=+e.target.dataset.q;
    answers[id]=answers[id]||{}; answers[id].choice='C'; answers[id].text=e.target.value;
    refreshCard(id); persist(); updateProgress();
  }
});
document.addEventListener('click',function(e){
  var opt=e.target.closest&&e.target.closest('.opt-c');
  if(opt&&e.target.tagName!=='INPUT'){ var ci=opt.querySelector('.c-input'); if(ci) ci.focus(); }
});

/* ---------- views ---------- */
function showQuestions(){
  document.getElementById('view-intro').style.display='none';
  document.getElementById('view-questions').style.display='block';
  document.getElementById('bar-prog').style.visibility='visible';
  document.getElementById('btn-reread').style.display='inline-block';
  try{ if(lsOK) localStorage.setItem(SKEY,'1'); }catch(e){}
  window.scrollTo(0,0);
}
function showIntro(){
  document.getElementById('view-questions').style.display='none';
  document.getElementById('view-intro').style.display='block';
  document.getElementById('bar-prog').style.visibility='hidden';
  document.getElementById('btn-reread').style.display='none';
  window.scrollTo(0,0);
}

/* ---------- save / export ---------- */
function buildMarkdown(){
  var d=new Date(), date=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  var out=[]; out.push('# Conflux — Vízválasztó');
  out.push('> Watershed answers · '+date+' · '+countAll()+'/'+TOTAL+' answered');
  out.push('');
  V.forEach(function(v){
    out.push('## '+v.emoji+'  '+v.name+' — '+v.persona);
    out.push('');
    qFor(v.name).forEach(function(q){
      var a=answers[q.id], ans;
      if(!isAnswered(a)) ans='_(unanswered)_';
      else if(a.choice==='A') ans='**A** — '+q.optionA;
      else if(a.choice==='B') ans='**B** — '+q.optionB;
      else ans='**In my own words** — '+a.text.trim();
      out.push('**Q'+q.id+'. '+q.question+'**');
      out.push('');
      out.push('→ '+ans);
      out.push('');
    });
  });
  out.push('---');
  out.push('_Generated by /vizvalaszto · the watershed. Hand this back to Claude to choose Conflux\\'s next step._');
  return out.join('\\n');
}
function openSave(){
  document.getElementById('md-out').value=buildMarkdown();
  document.getElementById('save-count').textContent=countAll()+' of '+TOTAL+' answered';
  document.getElementById('modal').classList.add('show');
}
function closeSave(){ document.getElementById('modal').classList.remove('show'); }
function copyMd(){
  var ta=document.getElementById('md-out');
  var done=function(){ var b=document.getElementById('btn-copy'); var o=b.textContent; b.textContent='Copied ✓'; setTimeout(function(){b.textContent=o;},1600); };
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(ta.value).then(done,function(){ta.select();try{document.execCommand('copy');done();}catch(e){}}); }
  else { ta.select(); try{document.execCommand('copy');done();}catch(e){} }
}
function downloadMd(){
  var blob=new Blob([document.getElementById('md-out').value],{type:'text/markdown'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a'); a.href=url; a.download='conflux-vizvalaszto.md';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},800);
}
function clearAll(){
  if(!confirm('Clear all '+countAll()+' answers on this device? This cannot be undone.')) return;
  answers={}; persist();
  document.querySelectorAll('.c-input').forEach(function(i){i.value='';});
  Q.forEach(function(q){ refreshCard(q.id); });
  updateProgress();
}

/* ---------- boot ---------- */
function boot(){
  if(!lsOK) showWarn();
  renderIntro(); renderQuestions(); applySaved(); updateProgress();
  if(lsOK && countAll()>0) persist(); // bake any seeded answers into local storage
  document.getElementById('btn-begin').addEventListener('click',showQuestions);
  document.getElementById('btn-reread').addEventListener('click',showIntro);
  document.getElementById('btn-save').addEventListener('click',openSave);
  document.getElementById('btn-save2').addEventListener('click',openSave);
  document.getElementById('btn-clear').addEventListener('click',clearAll);
  document.getElementById('btn-copy').addEventListener('click',copyMd);
  document.getElementById('btn-download').addEventListener('click',downloadMd);
  document.getElementById('btn-close').addEventListener('click',closeSave);
  document.getElementById('modal').addEventListener('click',function(e){ if(e.target.id==='modal') closeSave(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeSave(); });
  if('IntersectionObserver' in window){
    var obs=new IntersectionObserver(function(es){
      es.forEach(function(en){ if(en.isIntersecting){
        var id=en.target.id;
        document.querySelectorAll('.nav-item').forEach(function(b){ b.classList.toggle('active',b.dataset.target===id); });
      }});
    },{rootMargin:'-20% 0px -70% 0px'});
    document.querySelectorAll('.vsection').forEach(function(s){obs.observe(s);});
  }
  var started=false; try{ started=lsOK&&localStorage.getItem(SKEY)==='1'; }catch(e){}
  if(started||countAll()>0) showQuestions();
}
document.addEventListener('DOMContentLoaded',boot);
`;

const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Conflux · Vízválasztó — the watershed</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;780&display=swap" rel="stylesheet">
<style>${STYLE}</style>
</head>
<body>
<header class="bar">
  <div class="bar-in">
    <div class="brand"><span class="glyph"></span><b>Conflux</b><span class="sep">·</span><span class="vv">Vízválasztó</span></div>
    <button id="btn-reread" class="link" style="display:none;margin-left:8px">‹ the brief</button>
    <div class="bar-spacer"></div>
    <span id="saved" class="saved-pulse">saved ✓</span>
    <div id="bar-prog" class="bar-prog" style="visibility:hidden">
      <span id="count" class="count">0 / ${data.questions.length}</span>
      <div class="track"><div id="fill" class="fill"></div></div>
    </div>
    <button id="btn-save" class="btn primary small">Save → .md</button>
  </div>
</header>

<div id="lswarn" class="warn" style="display:none">Heads up: this browser is blocking local storage, so your answers won’t be remembered between visits. Answer in one sitting and hit <b>Save</b> before closing.</div>

<!-- ===== INTRO ===== -->
<section id="view-intro"><div class="wrap">
  <span class="kicker"><span style="color:var(--cyan)">◈</span> A Court of Experts · 50 questions</span>
  <h1 class="title">The <span class="grad">watershed</span>.</h1>
  <p class="subtitle">Vízválasztó — the ridge line where water decides which sea it runs to. One choice at the top decides everything downstream.</p>
  <p class="lede">Six experts studied Conflux and mapped the forks ahead. Below is where it stands today and what it could become — then fifty plain questions, each a real fork in the road. Answer at your own pace; it saves itself. When you’re done, hit <b>Save</b> and we’ll turn your answers into Conflux’s next step.</p>

  <div class="understand">
    <div class="ucard" style="--accent:var(--violet)"><h2>What Conflux is</h2><p id="u-is"></p></div>
    <div class="ucard" style="--accent:var(--cyan)"><h2>What it aims to become</h2><p id="u-be"></p></div>
    <div class="ucard" style="--accent:var(--ember)"><h2>How it could help the world</h2><p id="u-wi"></p></div>
  </div>

  <div class="section-label"><span>The Court of Experts</span><span class="ln"></span></div>
  <div class="court" id="court"></div>
  <p class="court-note" id="court-note"></p>

  <div class="begin-row">
    <button id="btn-begin" class="btn primary">Begin the 50 questions →</button>
    <span class="meta">6 experts · 50 forks · saves as you go</span>
  </div>
</div></section>

<!-- ===== QUESTIONS ===== -->
<section id="view-questions">
  <div class="q-layout">
    <nav class="side" id="side"></nav>
    <main class="q-main" id="q-main"></main>
  </div>
  <div class="wrap">
    <div class="q-foot">
      <h3>That’s the watershed.</h3>
      <p>Your answers are saved on this device as you go. When you’re ready, save them to a Markdown file and hand them back to Claude to choose Conflux’s next step.</p>
      <div class="row">
        <button id="btn-save2" class="btn primary">Save my answers → .md</button>
        <button id="btn-clear" class="btn ghost">Clear answers</button>
      </div>
    </div>
    <p class="foot-note">/vizvalaszto · a Conflux skill · the decisive fork-in-the-road tool</p>
  </div>
</section>

<!-- ===== SAVE MODAL ===== -->
<div id="modal" class="modal-bg">
  <div class="modal">
    <div class="modal-h"><h3>Your watershed answers</h3><span id="save-count" class="count"></span><button id="btn-close" class="link">✕</button></div>
    <div class="modal-b">
      <p class="hint">Best path — <b>copy this and paste it back to Claude</b>, who will save it into your project and propose the next step. Or download the <code>.md</code> directly.</p>
      <textarea id="md-out" readonly spellcheck="false"></textarea>
    </div>
    <div class="modal-f">
      <span class="grow">Saved locally on this device · nothing leaves your machine.</span>
      <button id="btn-download" class="btn">Download .md</button>
      <button id="btn-copy" class="btn primary">Copy</button>
    </div>
  </div>
</div>

<script id="viz-data" type="application/json">${json}</script>
<script id="viz-seed" type="application/json">${seedJson}</script>
<script>${CLIENT_JS}</script>
</body>
</html>`;

writeFileSync(outPath, HTML);
const total = data.questions.length;
const seedN = Object.keys(seed).length;
console.log('vizvalaszto: wrote ' + outPath + ' (' + (HTML.length / 1024).toFixed(0) + ' KB)');
console.log('  ' + total + ' questions across ' + VERTICALS.length + ' verticals; ' + seedN + ' answer(s) seeded; light theme; opens from file://');
