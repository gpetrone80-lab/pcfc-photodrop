/* Pinellas County Fire Conference — Design E "Training Event"
 * One script for all three pages: home (Photo Drop), /2027 (mailing list), /admin (photo manager).
 * Uses the same Firebase project, storage folder, Firestore collections and email alert as the
 * previous site, so uploads, the uploads on/off switch, sign-ups and admin sign-in keep working.
 * If Firebase isn't loaded (e.g. a design preview), the pages run in a clearly labeled demo mode.
 */
(function () {
"use strict";

/* ───────────── Settings: edit these ───────────── */
const CFG = {
  firebase: {
    apiKey: "AIzaSyAdMmgFx48tQyEmER_pj30q_3Ra3XsTN-I",
    authDomain: "pcfc-photo-drop.firebaseapp.com",
    projectId: "pcfc-photo-drop",
    storageBucket: "pcfc-photo-drop.firebasestorage.app",
    messagingSenderId: "708442037274",
    appId: "1:708442037274:web:b6b9a7b74b8e9b0395c5a3"
  },
  uploadFolder: "pcfc-2026",          // storage folder for attendee photos
  releaseVersion: "2026-10-23",       // stored with every photo as proof of the release
  maxMB: 15,
  notifyCollection: "notify2027",     // Firestore collection for the mailing list
  notifyInbox: "pinellascountyfireconference@gmail.com", // gets an email per sign-up (formsubmit.co)
  contactEmail: "pinellascountyfireconference@gmail.com", // shown on the Contact page; contact-form messages go here
  lastDates: "October 26–28, 2026",
  nextYear: "2027",
  nextDates: "Dates TBA",             // e.g. "October 25–27, 2027" once announced
  location: "Pinellas County, FL",
  albumUrl: "https://photos.app.goo.gl/PQEAafha5d4E1H9f7",
  instagram: "https://www.instagram.com/pinellascountyfireconference/",
  facebook: "https://www.facebook.com/Pinellascountyfireconference"
};

/* ───────────── Paths & environment ───────────── */
const ME = document.currentScript.src;
const ASSETS = ME.slice(0, ME.lastIndexOf("/") + 1);
const ROOT = ASSETS.replace(/assets\/$/, "");
const IMG = ASSETS + "img/";
const PREVIEW = !!window.PCFC_PREVIEW;
const app = document.getElementById("app");
const fb = (!PREVIEW && window.firebase) ? (firebase.apps.length ? firebase.app() : firebase.initializeApp(CFG.firebase)) : null;
const DEMO = !fb;
const URLS = { home: ROOT, "2027": ROOT + "2027/", photos: ROOT + "share-photos/", album: ROOT + "photo-album/", contact: ROOT + "contact/", admin: ROOT + "admin/" };
const PUBLIC = { home: "/", "2027": "/2027/", photos: "/share-photos/", album: "/photo-album/", contact: "/contact/" };
const SITE = "https://pinellascountyfireconference.com";
/* Where did this visitor come from? Links you post can carry ?src=fb-oct (or utm_source/utm_campaign).
   The tag is remembered for the visit and saved with sign-ups and photo uploads. */
const cleanTag = t => String(t || "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
const SRC = (() => {
  const q = new URLSearchParams(location.search);
  let t = cleanTag((q.get("src") || q.get("utm_source") || "") + (q.get("utm_campaign") ? "-" + q.get("utm_campaign") : ""));
  try { if (t) sessionStorage.setItem("pcfc_src", t); else t = sessionStorage.getItem("pcfc_src") || ""; } catch (e) {}
  return t;
})();

/* ───────────── State ───────────── */
const S = {
  page: app.dataset.page || "home",
  dd: null, menu: false, slide: 0, light: null, featured: [],
  topic: new URLSearchParams(location.search).get("topic") || "general", sent: false, sending: false, cErr: "", cEmail: "",
  uploadsOpen: true, anon: null,
  agreed: false, queue: [], uploading: false, uploadedAll: false,
  mine: getMine(), confirmMine: null,
  notified: false, email: "", notifyErr: "", saving: false,
  adm: { user: null, tab: "photos", items: [], sel: new Set(), loading: false, confirm: false, light: null,
         signups: null, signErr: "", loginErr: "", busy: "", err: "" }
};

/* ───────────── Helpers ───────────── */
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let toastT;
function toast(m) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2800);
}
function getMine() { try { return JSON.parse(localStorage.getItem("pcfc_my_uploads")) || []; } catch (e) { return []; } }
function setMine(a) { S.mine = a; try { localStorage.setItem("pcfc_my_uploads", JSON.stringify(a.filter(x => !x.demo))); } catch (e) {} }
// Photos: WebP (much smaller) with JPG fallback; phones get the 800px versions
const SMALL = Math.min(screen.width || innerWidth, innerWidth) * (window.devicePixelRatio || 1) <= 1100;
const pic = n => `${IMG}${n}${SMALL ? "-800" : ""}.webp`;
const bg = n => `background-image:url(${IMG}${n}.jpg);background-image:image-set(url(${pic(n)}) type('image/webp'),url(${IMG}${n}.jpg) type('image/jpeg'))`;

const I = {
  flame: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.6 2.2c.4 3-1.1 4.6-2.5 6.1C8.7 9.8 7.2 11.4 7.2 14a4.8 4.8 0 0 0 9.6 0c0-1.8-.8-3.2-1.8-4.3.1 1.4-.4 2.5-1.4 3 .5-3.4-.2-7.3-1-10.5z"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
  chev: '<svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"/></svg>',
  fb: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>'
};
const BADGE = `<img class="badge" src="${IMG}badge-conference.webp" width="150" height="200" alt="Pinellas County Fire Conference badge">`;
const ext = (href, label, cls) => `<a class="${cls || ""}" href="${href}" target="_blank" rel="noopener">${label}</a>`;
const go = (page, label, cls, hash) => `<a class="${cls || ""}" href="${URLS[page]}${hash ? "#" + hash : ""}" data-go="${page}"${hash ? ` data-hash="${hash}"` : ""}>${label}</a>`;

/* ───────────── Header / footer ───────────── */
function nav() {
  const L = [["home", "Home"], ["2027", CFG.nextYear + " Conference"], ["photos", "Share Photos"], ["album", "2026 Photo Album"], ["contact", "Contact"]];
  const link = ([p, l]) => `<a href="${URLS[p]}" data-go="${p}" class="plain"${S.page === p ? ' aria-current="page"' : ""}>${l}</a>`;
  const social = ext(CFG.facebook, "Facebook ↗") + ext(CFG.instagram, "Instagram ↗");
  return `<header class="enav"><div class="wrap">
    <a class="ebrand" href="${URLS.home}" data-go="home">${BADGE}<span class="eword">Pinellas County<b>Fire Conference</b></span></a>
    <div class="emeta"><span>${I.cal} ${CFG.nextYear} · ${esc(CFG.nextDates)}</span><span>${I.pin} ${esc(CFG.location)}</span></div>
    <nav class="emenu" aria-label="Main">${L.map(link).join("")}<div class="dd"><button type="button" data-act="dd" data-k="fol" aria-expanded="${S.dd === "fol"}">Follow us${I.chev}</button>${S.dd === "fol" ? `<div class="ddm">${social}</div>` : ""}</div></nav>
    <button type="button" class="eham" data-act="menu" aria-expanded="${S.menu}">${S.menu ? "Close" : "Menu"}</button></div>
    ${S.menu ? `<nav class="esheet" aria-label="Menu"><small>Pages</small>${L.map(link).join("")}<small>Follow us</small>${social}</nav>` : ""}</header>`;
}
function crumb(here, title) {
  return `<div class="wrap crumb"><small>${go("home", "Home")} ▸ <span>${here}</span></small><h1 class="ptitle">${I.flame}${title}</h1></div>`;
}
function footer() {
  const f = x => x.replace("<a ", '<a class="fl" ');
  return `<footer class="efoot"><div class="wrap"><div class="ecols">
    <div class="stack"><a class="ebrand" href="${URLS.home}" data-go="home">${BADGE}<span class="eword">Pinellas County<b>Fire Conference</b></span></a>
      <small style="text-transform:uppercase;letter-spacing:.06em;font-size:12px">Follow us</small>
      <div class="social"><a href="${CFG.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${I.fb}</a><a href="${CFG.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${I.ig}</a></div></div>
    <div><h2 class="fh">Pages</h2>${f(go("home", "Home"))}${f(go("2027", CFG.nextYear + " Conference"))}${f(go("photos", "Share Photos"))}${f(go("album", "2026 Photo Album"))}${f(go("contact", "Contact"))}</div>
    <div><h2 class="fh">Event info</h2>${f(go("2027", "What to expect", "", "schedule"))}${f(go("2027", "Mailing list", "", "list"))}${f(go("photos", "Photo release", "", "release"))}${f(ext(CFG.albumUrl, "Full album on Google Photos"))}</div>
    <div><h2 class="fh">Organizers</h2>${f(go("admin", "Organizer sign-in"))}${f(ext(CFG.facebook, "Facebook"))}${f(ext(CFG.instagram, "Instagram"))}</div>
   </div><p class="ecopy">© ${new Date().getFullYear()} Pinellas County Fire Conference · Hosted every year in Pinellas County, Florida · Hosted by local training chiefs &amp; instructors</p></div></footer>`;
}
function quickLinks() {
  return `<div class="obox"><h3>Quick links</h3><div class="qlinks">
    ${go("2027", CFG.nextYear + " Conference")}
    ${go("2027", "Join the " + CFG.nextYear + " mailing list", "", "list")}
    ${go("2027", "What to expect", "", "schedule")}
    ${go("photos", "Share your 2026 photos")}
    ${go("album", "2026 photo album")}
    ${go("contact", "Contact us")}
    ${ext(CFG.facebook, "Follow us on Facebook ↗")}
    ${ext(CFG.instagram, "Follow us on Instagram ↗")}
    <button type="button" data-act="copy">Copy link to share</button></div></div>`;
}

/* ───────────── Photo Drop ───────────── */
function uploader() {
  if (!S.uploadsOpen) return `<div class="card stack"><div class="closedbox">Photo uploads are closed right now. Please check back later!</div>
    <p class="fine">Want to hear about ${CFG.nextYear}?</p>${go("2027", "Get " + CFG.nextYear + " updates", "btn", "list")}${mineList()}</div>`;
  const n = S.queue.length, ready = n && S.agreed && !S.uploading;
  let label = "Select photos to begin";
  if (S.uploading) label = "Uploading…";
  else if (n && !S.agreed) label = "Check the release box to upload";
  else if (n) label = `Upload ${n} photo${n > 1 ? "s" : ""}`;
  return `<div class="card stack">
   <input type="file" id="fileIn" accept="image/*" multiple hidden>
   <div class="drop" role="button" tabindex="0" data-act="pick">${I.up}<strong>Choose photos from your phone</strong><small>JPG, PNG or HEIC · up to ${CFG.maxMB} MB each</small></div>
   ${n ? `<div class="stack" style="gap:6px">${S.queue.map((q, i) => `<div class="qrow ${q.st}" id="q${i}"><img src="${q.url}" alt=""><div><div class="nm"><span>${esc(q.name)}</span><b>${q.label}</b></div><div class="pbar"><i style="width:${q.pct}%"></i></div></div></div>`).join("")}</div>` : ""}
   <label class="check"><input type="checkbox" id="agree" ${S.agreed ? "checked" : ""}><span>I agree to the photo release and confirm I have the right to share these photos.</span></label>
   <details class="release" id="release"><summary>Read the photo release</summary>
    <p><b>PHOTO RELEASE</b>: By checking the box and uploading, I grant the Pinellas County Fire Conference, its organizers, and Gianluca Petrone permission to use, copy, edit, crop, publish, and share the photo(s) I upload on Facebook, Instagram, the conference website, and other promotional materials, without payment, royalties, or any further approval from me.</p>
    <p>I confirm the photos are mine to share, and that I have permission from the people pictured where it is needed. I understand the photos may show my own image and likeness, and I release the Pinellas County Fire Conference and its organizers from any claims or liability connected with this use.</p>
    <p>I am 18 years or older, or I am the parent/legal guardian of the minor pictured. If I later want a photo taken down, I can <a class="inlink" href="${URLS.contact}?topic=photo" data-go="contact" data-topic="photo">contact the conference</a> and it will be removed from future use.</p></details>
   <button type="button" class="btn" data-act="upload" ${ready ? "" : "disabled"}>${label}</button>
   ${S.uploadedAll ? `<div class="success" role="status">All photos uploaded. Thank you for sharing the fire!</div>` : ""}
   ${DEMO ? `<p class="fine">Preview mode: photos stay in this browser and are not sent anywhere.</p>` : `<p class="fine">No account, no sign-in. Your shots may be featured on our social pages.</p>`}
   ${mineList()}
  </div>`;
}
function mineList() {
  if (!S.mine.length) return "";
  return `<div class="stack" style="gap:8px"><b style="font-size:15px">Your uploads</b><p class="fine">Only you can delete these. Nobody else can touch them.</p>
   ${S.mine.map(m => `<div class="minerow"><span>${esc(m.name)}</span>${S.confirmMine === m.path
      ? `<span class="inline-confirm"><button type="button" class="btn xs danger" data-act="delmine" data-path="${esc(m.path)}">Delete</button><button type="button" class="btn xs alt" data-act="keepmine">Keep</button></span>`
      : `<button type="button" class="btn xs alt" data-act="askmine" data-path="${esc(m.path)}">Delete</button>`}</div>`).join("")}</div>`;
}
function pickFiles(files) {
  S.queue.forEach(q => URL.revokeObjectURL(q.url));
  S.queue = [...files].filter(f => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name)).map(f => {
    const big = f.size > CFG.maxMB * 1024 * 1024;
    return { file: f, name: f.name, url: URL.createObjectURL(f), pct: 0, st: big ? "err" : "", label: big ? `over ${CFG.maxMB} MB` : "ready", skip: big };
  });
  S.uploadedAll = false; render();
}
function setRow(i) {
  const q = S.queue[i], el = document.getElementById("q" + i); if (!el) return;
  el.className = "qrow " + q.st; el.querySelector(".pbar i").style.width = q.pct + "%"; el.querySelector(".nm b").textContent = q.label;
}
async function upload() {
  if (!S.uploadsOpen || !S.agreed || !S.queue.length) return;
  if (!DEMO && !S.anon) { toast("Still connecting. Try again in a moment."); return; }
  S.uploading = true; render();
  let ok = 0, tried = 0;
  for (let i = 0; i < S.queue.length; i++) {
    const q = S.queue[i]; if (q.skip) continue; tried++;
    try {
      if (DEMO) {
        for (let p = 0; p <= 100; p += 20) { q.pct = p; q.label = p + "%"; setRow(i); await new Promise(r => setTimeout(r, 90)); }
        setMine([{ path: "demo/" + Date.now() + i, name: q.name, demo: true }].concat(S.mine));
      } else {
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const safe = q.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const ref = fb.storage().ref(`${CFG.uploadFolder}/${S.anon.uid}/${stamp}_${safe}`);
        const task = ref.put(q.file, { customMetadata: { photoRelease: "agreed", releaseVersion: CFG.releaseVersion, consentAt: new Date().toISOString(), source: SRC || "direct" } });
        await new Promise((res, rej) => task.on("state_changed", s => { q.pct = Math.round(s.bytesTransferred / s.totalBytes * 100); q.label = q.pct + "%"; setRow(i); }, rej, res));
        setMine([{ path: ref.fullPath, name: q.name }].concat(S.mine.filter(x => x.path !== ref.fullPath)));
      }
      q.st = "done"; q.label = "uploaded ✓"; q.pct = 100; ok++;
    } catch (e) { q.st = "err"; q.label = "failed, try again"; }
    setRow(i);
  }
  S.uploading = false;
  S.uploadedAll = ok > 0 && ok === tried;
  const fileIn = document.getElementById("fileIn"); if (fileIn) fileIn.value = "";
  if (S.uploadedAll) { S.queue = []; }
  render();
}
async function deleteMine(path) {
  const item = S.mine.find(m => m.path === path); if (!item) return;
  try {
    if (!item.demo) await fb.storage().ref(path).delete();
    setMine(S.mine.filter(m => m.path !== path)); S.confirmMine = null; render(); toast("Photo deleted");
  } catch (e) { S.confirmMine = null; render(); toast("Couldn't delete. It may have been uploaded from a different browser."); }
}

/* ───────────── Mailing list ───────────── */
function listForm(src) {
  if (S.notified) return `<div class="eok"><div class="success" role="status">You're on the list. See you in ${CFG.nextYear}!</div>
    <p>We'll email <b>${esc(S.email)}</b> about 6 months before the event, and whenever the dates, host, classes and speakers are announced.</p>
    <p class="fine">Help us fill the room: share this page with your crew.</p>
    <div class="sharebar"><button type="button" class="btn sm alt" data-act="copy">${I.link} Copy link</button>${ext("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent("https://pinellascountyfireconference.com/2027/"), I.fb + " Share", "btn sm alt")}</div></div>`;
  return `<form id="notifyForm" class="eform" data-src="${src}" novalidate>
    <div class="field"><label for="fn">First name</label><input id="fn" autocomplete="given-name"></div>
    <div class="field"><label for="ln">Last name</label><input id="ln" autocomplete="family-name"></div>
    <div class="field full"><label for="em">Email (required)</label><input id="em" type="email" autocomplete="email" inputmode="email" placeholder="you@department.gov" value="${esc(S.email)}" required></div>
    <div class="field"><label for="dept">Department / agency</label><input id="dept" autocomplete="organization" placeholder="Your department"></div>
    <div class="field"><label for="jt">Rank / job title</label><input id="jt" autocomplete="organization-title" placeholder="Firefighter/EMT"></div>
    <input type="text" id="hp" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
    ${S.notifyErr ? `<p class="errbox full" role="alert">${esc(S.notifyErr)}</p>` : ""}
    <button class="btn full" type="submit" ${S.saving ? "disabled" : ""}>${S.saving ? "Saving…" : "Join the mailing list"}</button>
    <p class="fine full">Only email is required. We only email about the conference. No spam, ever.</p></form>`;
}
function listSection(src) {
  return `<section class="esec esec-light" id="list"><div class="wrap"><h2 class="ecenter">Want to attend the ${CFG.nextYear} conference?</h2>
    <h3>Stay up to date on event information by joining our mailing list!</h3>${listForm(src)}</div></section>`;
}
async function subscribe(form) {
  const v = id => (form.querySelector("#" + id) || {}).value || "";
  if (v("hp")) { S.notified = true; render(); return; }               // honeypot: quietly accept bots
  const email = v("em").trim().toLowerCase(); S.email = email;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { S.notifyErr = "Enter an email address like name@department.gov."; render(); document.getElementById("em").focus(); return; }
  const extra = { firstName: v("fn").trim(), lastName: v("ln").trim(), department: v("dept").trim(), title: v("jt").trim() };
  S.notifyErr = ""; S.saving = true; render();
  try {
    if (!DEMO) {
      try { await fb.auth().currentUser || await fb.auth().signInAnonymously(); } catch (e) {}
      const col = fb.firestore().collection(CFG.notifyCollection);
      const base = { email, at: firebase.firestore.FieldValue.serverTimestamp(), src: (SRC ? SRC + " · " : "") + form.dataset.src };
      try { await col.add(Object.assign({}, base, extra)); }
      catch (e) { await col.add(base); }                              // database rules may only allow email/at/src
      fetch("https://formsubmit.co/ajax/" + CFG.notifyInbox, {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(Object.assign({ email, _subject: `New PCFC ${CFG.nextYear} signup: ${email}`, _template: "table",
          message: `A new attendee signed up for ${CFG.nextYear} conference notifications: ${email}`, source: SRC || "direct" }, extra))
      }).catch(() => {});
    }
    S.notified = true;
  } catch (e) { S.notifyErr = "Couldn't save your email just now. Please try again in a moment."; }
  S.saving = false; render();
}

/* ───────────── Pages ───────────── */
const SLIDES = [["live-fire", "Live fire behind the crews · Fireground24 Photography"], ["two-man-can", "2 Man & A Can · Fireground24 Photography"],
  ["instructors", "The 2026 instructor cadre · Fireground24 Photography"], ["crew", "Crews at the training ground"],
  ["color-guard", "Color guard at the opening ceremony"], ["burn-room", "Inside the burn room"]];
function slides() {
  return `<div class="slides wide" aria-roledescription="carousel" aria-label="Scenes from the 2026 conference">${SLIDES.map((s, i) =>
    `<figure class="slide ${i === S.slide ? "on" : ""}" style="${bg(s[0])};background-size:cover;background-position:center;margin:0" aria-hidden="${i !== S.slide}"><figcaption>${esc(s[1])}</figcaption></figure>`).join("")}
   <div class="dots">${SLIDES.map((s, i) => `<button type="button" data-act="slide" data-i="${i}" aria-label="Show photo ${i + 1}" ${i === S.slide ? 'aria-current="true"' : ""}></button>`).join("")}</div></div>`;
}
function hero(img, h, p, ctas) {
  return `<section class="ehero" style="${bg(img)}"><span class="credit">Photo: Fireground24 Photography</span><div class="wrap"><h2>${h}</h2><p>${p}</p><div class="ectas">${ctas}</div></div></section>`;
}
const ALBUM_PHOTOS = [["live-fire", "Live fire behind the crews · Fireground24 Photography"], ["two-man-can", "2 Man & A Can · Fireground24 Photography"],
  ["instructors", "The 2026 instructor cadre · Fireground24 Photography"], ["crew", "Crews at the training ground"], ["color-guard", "Color guard at the opening ceremony"],
  ["burn-room", "Inside the burn room"], ["two-man-sign", "The 2 Man & A Can prop"], ["tower", "The training tower"], ["pcfc-sign", "PCFC 2026"],
  ["tower-tall", "Training tower and grounds"], ["tower-wide", "Training ground at sunrise"]];
// Photos from the previous site, kept on the server and shown in the album
const OLD_PHOTOS = [["2027/slide1.jpg", "Pinellas County Fire Conference banner"], ["2027/slide2.webp", "Live fire training"], ["2027/slide3.webp", "Turnout gear ready"]];
function albumList() {
  const a = S.featured.map(f => ({ src: f.url, full: f.url, cap: "Shared by an attendee", attendee: true }));
  ALBUM_PHOTOS.forEach(([n, c]) => a.push({ src: `${IMG}${n}-800.webp`, full: `${IMG}${n}.webp`, cap: c }));
  if (!PREVIEW) OLD_PHOTOS.forEach(([f, c]) => a.push({ src: ROOT + f, full: ROOT + f, cap: c }));
  return a;
}
function schedule() {
  const col = (day, items) => `<div><h4>${day}</h4>${items.map(([c, t]) => `<span class="pill ${c}">${t}</span>`).join("")}</div>`;
  return `<section class="esec" id="schedule" style="padding-top:0"><div class="wrap"><h2 class="ecenter">What to expect</h2><p class="fine">Based on the 2026 conference (${esc(CFG.lastDates)}). The ${CFG.nextYear} program will be posted here when it's announced.</p>
   <div class="sched">${col("Speaker day", [["w", "Opening ceremony & color guard"], ["w", "Speakers"]])}${col("Live fire HOT days", [["r", "Burn room evolutions"], ["r", "2 Man & A Can"], ["r", "Training tower"]])}${col("Run by", [["o", "Local training chiefs & instructors"]])}</div>
   <div class="ectas">${go("album", "See photos from 2026", "btn o")}</div></div></section>`;
}
function home() {
  const door = (p, img, h, t, cta) => `<a class="door" href="${URLS[p]}" data-go="${p}" style="${bg(img)}"><span><b>${h}</b><small>${t}</small><em>${cta} →</em></span></a>`;
  return `${nav()}<main>
  ${hero("live-fire", "Train with the Pinellas County fire family", `Speaker day and live fire HOT days, run by local training chiefs and instructors. The ${CFG.nextYear} conference is being planned now.`,
     go("2027", `Get ${CFG.nextYear} updates`, "btn", "list") + go("photos", "Share your 2026 photos", "btn w"))}
  <section class="esec"><div class="wrap"><h2 class="ecenter">Start here</h2>
   <div class="doors">${door("2027", "instructors", CFG.nextYear + " Conference", "Dates, host, classes and the mailing list", "See what's next")}${door("photos", "two-man-can", "Share Photos", "Were you there in 2026? Upload your shots", "Upload photos")}${door("album", "crew", "2026 Photo Album", "Scenes from the training ground", "Browse photos")}</div></div></section>
  <section class="esec" id="why" style="padding-top:0"><div class="wrap"><h2 class="ecenter">Why firefighters come back every year</h2>
   <div class="eboxes"><div class="obox"><h3>Why attend</h3><p>Every year the Pinellas County Fire Conference brings firefighters, officers and instructors from across the county together for a speaker day and live fire HOT (hands-on training) days, run by local training chiefs and instructors.</p>
    <p>The ${CFG.nextYear} conference is being planned now. ${go("2027", "Join the mailing list", "inlink", "list")} to hear the dates, host department, classes and speakers first.</p></div>${quickLinks()}</div></div></section>
  ${listSection("home-page")}</main>${footer()}`;
}
function p2027() {
  const steps = [["Now", [["w", "Join the mailing list"]]], ["~6 months out", [["r", "Host & dates announced"], ["r", "Classes & speakers posted"]]], ["Conference", [["o", "Registration opens"], ["r", "Speaker day + live fire HOT days"]]]];
  return `${nav()}<main>${crumb(CFG.nextYear + " Conference", CFG.nextYear + " Conference")}
  ${hero("instructors", `See you in ${CFG.nextYear}`, "The instructors are already planning. Join the list to hear the dates, host, classes and speakers first.", go("2027", "Notify me", "btn", "list"))}
  <section class="esec"><div class="wrap"><h2 class="ecenter">The conference returns in ${CFG.nextYear}</h2>
   <div class="eboxes"><div class="obox"><h3>What we know so far</h3><dl><dt>Where</dt><dd>${esc(CFG.location)}</dd><dt>Format</dt><dd>Speaker day + live fire HOT days</dd><dt>Dates</dt><dd>${CFG.nextDates === "Dates TBA" ? "To be announced, about 6 months before the event" : esc(CFG.nextDates)}</dd><dt>Host</dt><dd>To be announced</dd></dl><p>Join the list and you'll get an email at each announcement.</p></div>${quickLinks()}</div></div></section>
  ${schedule()}
  <section class="esec" style="padding-top:0"><div class="wrap"><h2 class="ecenter">What happens next</h2>
   <div class="sched">${steps.map(([d, it]) => `<div><h4>${d}</h4>${it.map(([c, t]) => `<span class="pill ${c}">${t}</span>`).join("")}</div>`).join("")}</div></div></section>
  <section class="esec" style="padding-top:0"><div class="wrap"><h2 class="ecenter">Scenes from 2026</h2>${slides()}<div class="ectas">${go("album", "See the 2026 photo album", "btn o")}${go("photos", "Share your photos", "btn w")}</div></div></section>
  ${listSection("2027-page")}</main>${footer()}`;
}
function photosPage() {
  const statusPill = S.uploadsOpen ? `<span class="statuspill"><i></i>Photo uploads open</span>` : `<span class="statuspill closed"><i></i>Uploads closed for now</span>`;
  return `${nav()}<main>${crumb("Share Photos", "Share your photos")}
  <section class="esec" id="photos"><div class="wrap hero-grid"><div class="stack">
    <h2 style="font-size:clamp(28px,3cqi + 16px,44px)">Share the fire</h2>
    <p class="lede">Were you at the 2026 conference? Upload your photos. No account, no sign-in. The best shots get featured on our Facebook and Instagram.</p><div>${statusPill}</div>
    <div class="obox"><h3 style="text-align:left">How it works</h3><ol class="howto"><li>Tap <b>Choose photos</b> and pick shots from your phone.</li><li>Check the photo release box.</li><li>Tap <b>Upload</b>. That's it.</li></ol></div></div>${uploader()}</div></section>
  <section class="esec" style="padding-top:0"><div class="wrap"><div class="crossband"><div><h3>See everyone's shots</h3><p>Browse the 2026 photo album.</p></div>${go("album", "Open the photo album", "btn o")}</div></div></section>
  </main>${footer()}`;
}
function albumPage() {
  const list = albumList(), L = S.light !== null ? list[S.light] : null, nf = S.featured.length;
  const tile = (p, i) => `<button type="button" class="aph" data-act="aopen" data-i="${i}" aria-label="${esc(p.cap)}"><img src="${esc(p.src)}" alt="${esc(p.cap)}" loading="lazy" onerror="this.parentNode.hidden=true"></button>`;
  return `${nav()}<main>${crumb("2026 Photo Album", "2026 photo album")}
  ${nf ? `<section class="esec"><div class="wrap"><h2 class="ecenter">Shared by attendees</h2><p class="fine">Photos people uploaded on Share Photos, picked by the organizers.</p>
   <div class="agrid">${list.slice(0, nf).map(tile).join("")}</div><div class="ectas">${go("photos", "Add your photos", "btn")}</div></div></section>` : ""}
  <section class="esec"${nf ? ' style="padding-top:0"' : ""}><div class="wrap"><h2 class="ecenter">Scenes from the 2026 conference</h2><p class="fine">A selection from the 2026 album. Tap a photo to see it larger.</p>
   <div class="agrid">${list.slice(nf).map((p, i) => tile(p, i + nf)).join("")}</div>
   <div class="ectas">${ext(CFG.albumUrl, "Open the full album on Google Photos ↗", "btn o")}${go("photos", "Add your photos", "btn w")}</div></div></section>
  </main>${footer()}
  ${L ? `<div class="lightbox" data-act="close" role="dialog" aria-label="${esc(L.cap)}"><div class="box"><img src="${esc(L.full)}" alt="${esc(L.cap)}"><div class="row"><span>${esc(L.cap)}</span><span style="display:flex;gap:8px"><button type="button" class="btn sm alt lbx" data-act="anav" data-d="-1" aria-label="Previous photo">←</button><button type="button" class="btn sm alt lbx" data-act="anav" data-d="1" aria-label="Next photo">→</button><button type="button" class="btn sm alt lbx" data-act="close">Close</button></span></div></div></div>` : ""}`;
}
const TOPICS = [["general", "General question"], ["classes", "Classes & training"], ["vendor", "Vendors & sponsors"], ["photo", "Photo takedown request"], ["media", "Media"]];
function contactPage() {
  const form = S.sent
    ? `<div class="card stack"><div class="success" role="status">Thanks! Your message was sent. We'll reply to ${esc(S.cEmail)}.</div><button type="button" class="btn alt" data-act="newmsg">Send another message</button></div>`
    : `<form id="contactForm" class="card stack" novalidate>
   <div class="field"><label for="cn">Your name</label><input id="cn" autocomplete="name"></div>
   <div class="field"><label for="ce">Your email (required)</label><input id="ce" type="email" autocomplete="email" inputmode="email" required></div>
   <div class="field"><label for="ct">Topic</label><select id="ct">${TOPICS.map(([v, l]) => `<option value="${v}"${S.topic === v ? " selected" : ""}>${l}</option>`).join("")}</select></div>
   <div class="field"><label for="cm">Message (required)</label><textarea id="cm" rows="6" required></textarea></div>
   <input type="text" id="chp" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
   ${S.cErr ? `<p class="errbox" role="alert">${esc(S.cErr)}</p>` : ""}
   <button class="btn" type="submit" ${S.sending ? "disabled" : ""}>${S.sending ? "Sending…" : "Send message"}</button>
   <p class="fine">Messages go to the conference organizers. We never share your email.</p></form>`;
  return `${nav()}<main>${crumb("Contact", "Contact us")}
  <section class="esec"><div class="wrap hero-grid"><div class="stack">
    <h2 style="font-size:clamp(28px,3cqi + 16px,44px)">Get in touch</h2>
    <p class="lede">Questions about the conference, classes, vendors or sponsorship? Want a photo taken down? Send a message and an organizer will get back to you.</p>
    <div class="obox"><h3 style="text-align:left">Email</h3><p><a class="inlink" href="mailto:${CFG.contactEmail}">${esc(CFG.contactEmail)}</a></p><div><button type="button" class="btn sm alt" data-act="copyemail">Copy email address</button></div>
      <h3 style="text-align:left">Social</h3><p>${ext(CFG.facebook, "Message us on Facebook ↗", "inlink")}<br>${ext(CFG.instagram, "Instagram ↗", "inlink")}</p></div></div>
   ${form}</div></section></main>${footer()}`;
}
async function sendContact(form) {
  const v = id => (form.querySelector("#" + id) || {}).value || "";
  if (v("chp")) { S.sent = true; render(); return; }                  // honeypot
  const email = v("ce").trim(), msg = v("cm").trim(), topic = (TOPICS.find(t => t[0] === v("ct")) || TOPICS[0])[1];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { S.cErr = "Enter your email address so we can reply."; render(); return; }
  if (msg.length < 5) { S.cErr = "Write a short message."; render(); return; }
  S.cErr = ""; S.sending = true; S.cEmail = email; S.topic = v("ct"); render();
  try {
    if (!PREVIEW) {
      const r = await fetch("https://formsubmit.co/ajax/" + CFG.contactEmail, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name: v("cn").trim(), email, topic, message: msg, source: SRC || "direct", _replyto: email, _subject: "PCFC website message: " + topic, _template: "table" }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || String(j.success) === "false") throw new Error("send failed");
    }
    S.sent = true;
  } catch (e) { S.cErr = `Your message didn't go through. Please email us at ${CFG.contactEmail} instead.`; }
  S.sending = false; render();
}

/* ───────────── Admin ───────────── */
const A = S.adm;
A.feat = new Map(); A.lmPage = "home"; A.lmTag = "";
function admin() {
  if (!A.user) return `<main class="login"><form class="card" id="loginForm" novalidate>${BADGE.replace('class="badge"', 'class="badge" style="height:84px;margin:0 auto"')}
    <h1 style="font-size:28px;text-align:center">Organizer sign-in</h1><p class="fine" style="text-align:center">Sign in with your admin account to manage photos and the ${CFG.nextYear} list.</p>
    <div class="field"><label for="ae">Email</label><input id="ae" type="email" autocomplete="username" required></div>
    <div class="field"><label for="ap">Password</label><input id="ap" type="password" autocomplete="current-password" required></div>
    ${A.loginErr ? `<p class="errbox" role="alert">${esc(A.loginErr)}</p>` : ""}
    <button class="btn" type="submit">Sign in</button>
    ${DEMO ? `<p class="fine">Preview mode: any email and password will work, and the photos are samples.</p>` : ""}
    ${go("home", "← Back to the site", "fine")}</form></main>`;
  const n = A.sel.size, items = A.items, t = A.tab, cur = k => t === k ? 'aria-current="page"' : "";
  const contributors = new Set(items.map(p => p.uid)).size;
  let body = "";
  if (t === "photos") {
    body = `<div class="stats"><div class="stat"><b class="${A.loading ? "loading" : ""}">${items.length}</b><span>Photos</span></div><div class="stat"><b>${contributors}</b><span>Contributors</span></div><div class="stat"><b>${A.signups ? A.signups.length : "–"}</b><span>${CFG.nextYear} sign-ups</span></div></div>
     <div class="atools"><button type="button" class="btn sm alt" data-act="selall" ${items.length ? "" : "disabled"}>${n && n === items.length ? "Clear selection" : "Select all"}</button>
      <button type="button" class="btn sm" data-act="zipall" ${items.length && !A.busy ? "" : "disabled"}>${A.busy === "all" ? "Zipping…" : "⬇ Download all (ZIP)"}</button>
      <button type="button" class="btn sm alt" data-act="zipsel" ${n && !A.busy ? "" : "disabled"}>${A.busy === "sel" ? "Zipping…" : `⬇ ZIP selected${n ? ` (${n})` : ""}`}</button>
      <button type="button" class="btn sm o" data-act="feature" ${n && !A.busy ? "" : "disabled"}>★ Show on site</button>
      <button type="button" class="btn sm alt" data-act="unfeature" ${n && !A.busy ? "" : "disabled"}>Remove from site</button>
      <button type="button" class="btn sm alt" data-act="refresh">↻ Refresh</button>
      <span class="sp"></span><button type="button" class="btn sm danger" data-act="del" ${n ? "" : "disabled"}>Delete${n ? ` (${n})` : ""}</button></div>
     ${A.confirm ? `<div class="confirm" role="alertdialog" aria-label="Confirm delete">Delete ${n} photo${n > 1 ? "s" : ""} permanently? This can't be undone.<span style="flex:1"></span><button type="button" class="btn sm alt" data-act="cancel">Keep them</button><button type="button" class="btn sm danger" data-act="reallydel">Delete permanently</button></div>` : ""}
     <p class="note">ⓘ Downloading only makes copies on your computer. The originals stay on the site. Only Delete removes photos. ★ Show on site adds the selected photos to the public 2026 Photo Album.</p>
     ${A.err ? `<p class="errbox" role="alert">${esc(A.err)}</p>` : ""}
     ${A.loading ? `<p class="empty">Loading photos…</p>` : items.length ? `<div class="grid">${items.map((p, i) => `<button type="button" class="tile ${A.sel.has(i) ? "sel" : ""}" data-act="tile" data-i="${i}" aria-pressed="${A.sel.has(i)}" aria-label="${esc(p.name)}"><img src="${esc(p.url)}" alt="" loading="lazy"><span class="tick">✓</span>${A.feat.has(p.path) ? `<span class="star">★ On site</span>` : ""}<span class="meta">${esc(p.name)}</span></button>`).join("")}</div>
       <p class="fine">Tap a photo to select it. Double-click (or double-tap) to view it full size.</p>` : `<p class="empty">No photos uploaded yet. Check back after the conference kicks off!</p>`}`;
  } else if (t === "signups") {
    const rows = A.signups || [], by = {};
    rows.forEach(r => { const x = String(r.src || ""), k = x.includes(" · ") ? x.split(" · ")[0] : "direct"; by[k] = (by[k] || 0) + 1; });
    body = A.signErr ? `<p class="errbox">${esc(A.signErr)}</p>` : `${rows.length ? `<div class="srcs"><b>Where sign-ups came from</b>${Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span class="chip">${esc(k)} <b>${v}</b></span>`).join("")}</div>` : ""}<div class="ahead" style="margin:0"><p class="fine">${rows.length} ${rows.length === 1 ? "person wants" : "people want"} to hear about ${CFG.nextYear}.</p><button type="button" class="btn sm" data-act="csv" ${rows.length ? "" : "disabled"}>⬇ Export CSV</button></div>
     <div class="tbl"><table><thead><tr><th>Email</th><th>Name</th><th>Department</th><th>Joined</th><th>From</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.email)}</td><td>${esc([r.firstName, r.lastName].filter(Boolean).join(" "))}</td><td>${esc(r.department)}</td><td class="num">${esc(r.when)}</td><td>${esc(r.src)}</td></tr>`).join("") || `<tr><td colspan="5">No sign-ups yet.</td></tr>`}</tbody></table></div>`;
  } else {
    body = `<div class="switch"><div><b>Photo uploads</b><p class="fine">${S.uploadsOpen ? "On: attendees can upload photos right now." : "Off: the home page says uploads are closed and points visitors to the mailing list."}</p></div><button type="button" role="switch" aria-checked="${S.uploadsOpen}" aria-label="Photo uploads" data-act="toggle"></button></div>
     <div class="obox lm"><h3>Share-link maker</h3><p class="fine">Add a tag to every link you post so the ${CFG.nextYear} sign-ups tab shows which post brought people in. Use a short tag like <b>fb-nov</b>, <b>ig-story</b> or <b>flyer</b>.</p>
      <div class="lmrow"><div class="field"><label for="lmp">Page</label><select id="lmp">${Object.entries({ home: "Home", "2027": CFG.nextYear + " Conference", photos: "Share Photos", album: "2026 Photo Album", contact: "Contact" }).map(([k, l]) => `<option value="${k}"${A.lmPage === k ? " selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="field"><label for="lmt">Tag</label><input id="lmt" placeholder="fb-nov" value="${esc(A.lmTag)}"></div></div>
      <div class="lmout"><code id="lmo">${esc(lmLink())}</code><button type="button" class="btn sm" data-act="lmcopy">Copy link</button></div></div>
     <div class="obox lm"><h3>QR codes</h3><p class="fine">Print these on flyers and table tents. Each one is already tagged, so scans show up in the sign-ups tab and in uploaded photo details.</p>
      <div class="qrs"><a href="${ROOT}qr-share-photos.png" target="_blank" rel="noopener"><img src="${ROOT}qr-share-photos.png" alt="QR code for Share Photos" width="140" height="140"><span>Share Photos</span></a>
      <a href="${ROOT}qr-2027-list.png" target="_blank" rel="noopener"><img src="${ROOT}qr-2027-list.png" alt="QR code for the ${CFG.nextYear} mailing list" width="140" height="140"><span>${CFG.nextYear} mailing list</span></a></div></div>`;
  }
  return `<div class="admin"><aside class="side"><a class="brand" href="${URLS.home}" data-go="home">${BADGE}<span>PCFC Admin<small>${esc(A.user.email || "Organizer")}</small></span></a>
    <button type="button" data-act="atab" data-t="photos" ${cur("photos")}>Photos <span>${items.length}</span></button>
    <button type="button" data-act="atab" data-t="signups" ${cur("signups")}>${CFG.nextYear} sign-ups <span>${A.signups ? A.signups.length : ""}</span></button>
    <button type="button" data-act="atab" data-t="settings" ${cur("settings")}>Settings</button>
    <span class="grow"></span>${go("home", "View site ↗")}<button type="button" data-act="signout">Sign out</button></aside>
   <main class="amain"><div class="ahead"><h1>${{ photos: "Photo uploads", signups: CFG.nextYear + " sign-ups", settings: "Settings" }[t]}</h1>${DEMO ? `<span class="sample">Preview · sample data</span>` : ""}</div>${body}</main>
   ${A.light !== null && items[A.light] ? `<div class="lightbox" data-act="close"><div class="box"><img src="${esc(items[A.light].url)}" alt="${esc(items[A.light].name)}"><div class="row"><span>${esc(items[A.light].name)}</span><span style="display:flex;gap:8px"><a class="btn sm" href="${esc(items[A.light].url)}" target="_blank" rel="noopener">⬇ Download</a><button type="button" class="btn sm alt" style="color:#fff;box-shadow:inset 0 0 0 2px #fff" data-act="close">Close</button></span></div></div></div>` : ""}</div>`;
}
function lmLink() {
  const t = cleanTag(A.lmTag);
  return SITE + PUBLIC[A.lmPage || "home"] + (t ? "?src=" + t : "");
}
async function loadFeatured() {
  if (DEMO) { A.feat = new Map(S.featured.map(f => [f.path, f.id])); return; }
  try { const snap = await fb.firestore().collection("featured").get(); A.feat = new Map(snap.docs.map(d => [d.data().path, d.id])); }
  catch (e) { A.feat = new Map(); }
}
async function setFeatured(on) {
  const idx = [...A.sel].filter(i => on ? !A.feat.has(A.items[i].path) : A.feat.has(A.items[i].path));
  if (!idx.length) { toast(on ? "Those photos are already on the site." : "None of those photos are on the site."); return; }
  A.busy = "feat"; render(); let ok = 0;
  try {
    for (const i of idx) {
      const it = A.items[i];
      if (DEMO) {
        if (on) { const id = "demo" + Date.now() + i; S.featured.unshift({ id, url: it.url, path: it.path, name: it.name }); A.feat.set(it.path, id); }
        else { const id = A.feat.get(it.path); S.featured = S.featured.filter(f => f.id !== id); A.feat.delete(it.path); }
      } else {
        const col = fb.firestore().collection("featured");
        if (on) { const d = await col.add({ url: it.url, path: it.path, name: it.name, at: firebase.firestore.FieldValue.serverTimestamp() }); A.feat.set(it.path, d.id); }
        else { await col.doc(A.feat.get(it.path)).delete(); A.feat.delete(it.path); }
      }
      ok++;
    }
    toast(on ? `${ok} photo${ok > 1 ? "s" : ""} added to the 2026 Photo Album` : `${ok} photo${ok > 1 ? "s" : ""} removed from the album`);
  } catch (e) { toast("Couldn't update the album. Publish the new database rules first (see SITE-GUIDE.md)."); }
  A.busy = ""; A.sel.clear(); render();
}
async function loadPhotos() {
  if (A.loading) return;
  A.loading = true; A.err = ""; A.sel.clear(); A.confirm = false; render();
  try {
    if (DEMO) {
      A.items = ["live-fire", "two-man-can", "instructors", "crew", "color-guard", "burn-room", "two-man-sign", "tower", "pcfc-sign", "tower-tall"].map((n, i) => ({ name: `IMG_${2041 + i * 7}.jpg`, path: `demo/${n}`, url: IMG + n + "-800.webp", uid: "u" + (i % 6), demo: true }));
    } else {
      const st = fb.storage(), root = await st.ref(CFG.uploadFolder + "/").listAll();
      let refs = [...root.items];
      for (const pre of root.prefixes) refs.push(...(await st.ref(pre.fullPath).listAll()).items);
      const seen = new Set(); refs = refs.filter(r => !seen.has(r.fullPath) && seen.add(r.fullPath)).sort((a, b) => b.name.localeCompare(a.name));
      A.items = await Promise.all(refs.map(async r => ({ ref: r, path: r.fullPath, name: r.name, url: await r.getDownloadURL(), uid: r.parent ? r.parent.name : "" })));
    }
    await loadFeatured();
  } catch (e) { A.err = "Couldn't load photos. Check your connection and try again."; }
  A.loading = false; render();
}
async function loadSignups() {
  A.signErr = "";
  try {
    if (DEMO) { A.signups = [{ email: "a.rivera@example.com", firstName: "Sample", department: "Example FD", when: "Oct 28, 2026", src: "2027-page" }, { email: "captain.lee@example.com", when: "Oct 27, 2026", src: "home-page" }]; }
    else {
      const snap = await fb.firestore().collection(CFG.notifyCollection).orderBy("at", "desc").get();
      A.signups = snap.docs.map(d => { const x = d.data(); const at = x.at && x.at.toDate ? x.at.toDate() : null;
        return Object.assign({}, x, { when: at ? at.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "" }); });
    }
  } catch (e) { A.signups = null; A.signErr = "The sign-up list couldn't be read. Your Firestore rules may need to let admins read the " + CFG.notifyCollection + " collection (see README)."; }
  render();
}
function saveFile(blob, name) {
  if (PREVIEW) { toast("Preview: on the live site this downloads " + name); return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
async function zip(idx, which) {
  if (!idx.length) return;
  if (typeof JSZip === "undefined") { toast(PREVIEW ? "Preview: on the live site this downloads a ZIP of copies" : "ZIP tool didn't load. Refresh and try again."); return; }
  A.busy = which; render();
  try {
    const z = new JSZip(); let ok = 0;
    for (const i of idx) { try { const r = await fetch(A.items[i].url); if (!r.ok) throw 0; z.file(A.items[i].name, await r.blob()); ok++; } catch (e) {} }
    if (!ok) toast("Couldn't download the selected photos.");
    else { saveFile(await z.generateAsync({ type: "blob" }), "pcfc-photos.zip"); if (ok < idx.length) toast(`Zipped ${ok} of ${idx.length} photos.`); }
  } finally { A.busy = ""; render(); }
}
async function deleteSelected() {
  const idx = [...A.sel]; let ok = 0, fail = 0;
  for (const i of idx) {
    const it = A.items[i];
    try { if (!it.demo) await it.ref.delete(); ok++; } catch (e) { fail++; continue; }
    if (A.feat.has(it.path)) {                       // also take it off the public album
      try { if (DEMO) S.featured = S.featured.filter(f => f.path !== it.path); else await fb.firestore().collection("featured").doc(A.feat.get(it.path)).delete(); } catch (e) {}
      A.feat.delete(it.path);
    }
  }
  if (DEMO) { A.items = A.items.filter((_, i) => !A.sel.has(i)); A.sel.clear(); A.confirm = false; render(); }
  else await loadPhotos();
  toast(fail ? `Deleted ${ok}, ${fail} failed.` : `${ok} photo${ok > 1 ? "s" : ""} deleted`);
}
function csv() {
  const rows = [["email", "first name", "last name", "department", "title", "joined", "source"]].concat((A.signups || []).map(r => [r.email, r.firstName, r.lastName, r.department, r.title, r.when, r.src]));
  saveFile(new Blob([rows.map(r => r.map(c => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" }), `pcfc-${CFG.nextYear}-signups.csv`);
}

/* ───────────── Render & events ───────────── */
let slideT;
function render() {
  const y = window.scrollY, keep = {}, focusId = document.activeElement && app.contains(document.activeElement) ? document.activeElement.id : "";
  app.querySelectorAll("input[id],textarea[id],select[id]").forEach(el => { if (el.type !== "file" && el.type !== "checkbox" && el.id !== "lmt") keep[el.id] = el.value; });
  app.innerHTML = ({ home, "2027": p2027, photos: photosPage, album: albumPage, contact: contactPage, admin })[S.page]();
  for (const id in keep) { const el = document.getElementById(id); if (el && el.tagName !== "SELECT" && !el.value) el.value = keep[id]; }
  if (focusId) { const f = document.getElementById(focusId); if (f) f.focus({ preventScroll: true }); }
  window.scrollTo(0, y);
  clearInterval(slideT);
  if (S.page === "2027" && !matchMedia("(prefers-reduced-motion: reduce)").matches)
    slideT = setInterval(() => { S.slide = (S.slide + 1) % SLIDES.length;
      document.querySelectorAll(".slide").forEach((s, i) => { s.classList.toggle("on", i === S.slide); s.setAttribute("aria-hidden", i !== S.slide); });
      document.querySelectorAll(".dots button").forEach((b, i) => b.toggleAttribute("aria-current", i === S.slide)); }, 4500);
}
function navigate(page, hash) {
  S.dd = null; S.menu = false;
  if (page === S.page) { render(); scrollToId(hash); return; }
  if (!PREVIEW) { location.href = URLS[page] + (hash ? "#" + hash : ""); return; }
  S.page = page; app.dataset.page = page; render(); if (page === "admin" && A.user && !A.items.length) loadPhotos();
  hash ? scrollToId(hash) : window.scrollTo(0, 0);
}
function scrollToId(id) { if (!id) return; const el = document.getElementById(id); if (!el) return; if (el.tagName === "DETAILS") el.open = true; el.scrollIntoView({ behavior: "smooth", block: "start" }); }

app.addEventListener("click", e => {
  if (S.dd && !e.target.closest(".dd")) { S.dd = null; if (!e.target.closest("[data-act],[data-go]")) { render(); return; } }
  const g = e.target.closest("a[data-go]");
  if (g) { if (!PREVIEW && g.search) return; e.preventDefault(); if (g.dataset.topic) { S.topic = g.dataset.topic; S.sent = false; } navigate(g.dataset.go, g.dataset.hash); return; }
  const a = e.target.closest("[data-act]"); if (!a) return;
  if (a.dataset.act === "close" && e.target.closest(".box") && !e.target.closest('button[data-act="close"]')) return;
  const d = a.dataset;
  switch (d.act) {
    case "menu": S.menu = !S.menu; S.dd = null; render(); break;
    case "dd": S.dd = S.dd === d.k ? null : d.k; render(); break;
    case "pick": { const f = document.getElementById("fileIn"); if (f) f.click(); break; }
    case "upload": upload(); break;
    case "askmine": S.confirmMine = d.path; render(); break;
    case "keepmine": S.confirmMine = null; render(); break;
    case "delmine": deleteMine(d.path); break;
    case "slide": S.slide = +d.i; render(); break;
    case "copy": { const u = SITE + (PUBLIC[S.page] || "/");
      (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast("Link copied"), () => toast(u)); break; }
    case "atab": A.tab = d.t; A.confirm = false; render(); if (d.t === "signups" && !A.signups) loadSignups(); break;
    case "tile": { const i = +d.i; if (e.detail === 2) { A.light = i; A.sel.delete(i); } else { A.sel.has(i) ? A.sel.delete(i) : A.sel.add(i); } A.confirm = false; render(); break; }
    case "selall": if (A.sel.size === A.items.length) A.sel.clear(); else A.items.forEach((_, i) => A.sel.add(i)); render(); break;
    case "zipall": zip(A.items.map((_, i) => i), "all"); break;
    case "zipsel": zip([...A.sel], "sel"); break;
    case "refresh": loadPhotos(); break;
    case "del": A.confirm = true; render(); break;
    case "cancel": A.confirm = false; render(); break;
    case "reallydel": deleteSelected(); break;
    case "close": A.light = null; S.light = null; render(); break;
    case "feature": setFeatured(true); break;
    case "unfeature": setFeatured(false); break;
    case "newmsg": S.sent = false; render(); break;
    case "copyemail": (navigator.clipboard ? navigator.clipboard.writeText(CFG.contactEmail) : Promise.reject()).then(() => toast("Email address copied"), () => toast(CFG.contactEmail)); break;
    case "lmcopy": { const u = lmLink(); (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast("Link copied"), () => toast(u)); break; }
    case "aopen": S.light = +d.i; render(); break;
    case "anav": { const n = albumList().length; S.light = (S.light + (+d.d) + n) % n; render(); break; }
    case "csv": csv(); break;
    case "toggle": {
      const on = !S.uploadsOpen;
      if (DEMO) { S.uploadsOpen = on; render(); toast(on ? "Uploads are open" : "Uploads are closed"); break; }
      fb.firestore().collection("config").doc("site").set({ uploadsEnabled: on }, { merge: true }).then(() => toast(on ? "Uploads are open" : "Uploads are closed"), () => toast("Couldn't save. Check your connection."));
      break; }
    case "signout": if (DEMO) { A.user = null; render(); } else fb.auth().signOut(); break;
  }
});
app.addEventListener("keydown", e => {
  if (e.key === "Escape" && (S.dd || A.light !== null || S.light !== null)) { S.dd = null; A.light = null; S.light = null; render(); return; }
  if (S.light !== null && (e.key === "ArrowRight" || e.key === "ArrowLeft")) { const n = albumList().length; S.light = (S.light + (e.key === "ArrowRight" ? 1 : -1) + n) % n; render(); return; }
  const dz = e.target.closest(".drop"); if (dz && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); document.getElementById("fileIn").click(); }
});
app.addEventListener("change", e => {
  if (e.target.id === "agree") { S.agreed = e.target.checked; render(); }
  if (e.target.id === "fileIn") pickFiles(e.target.files);
});
app.addEventListener("input", e => {
  if (e.target.id === "em") S.email = e.target.value;
  if (e.target.id === "lmt" || e.target.id === "lmp") { if (e.target.id === "lmt") A.lmTag = e.target.value; else A.lmPage = e.target.value; const o = document.getElementById("lmo"); if (o) o.textContent = lmLink(); }
});
app.addEventListener("submit", async e => {
  e.preventDefault();
  if (e.target.id === "notifyForm") subscribe(e.target);
  if (e.target.id === "contactForm") sendContact(e.target);
  if (e.target.id === "loginForm") {
    const email = e.target.querySelector("#ae").value.trim(), pw = e.target.querySelector("#ap").value;
    if (!email || !pw) { A.loginErr = "Enter your email and password."; render(); return; }
    A.loginErr = "";
    if (DEMO) { A.user = { email }; render(); loadPhotos(); loadSignups(); return; }
    try { await fb.auth().signInWithEmailAndPassword(email, pw); }
    catch (err) { A.loginErr = "Sign-in failed. Check your email and password and try again."; render(); }
  }
});

/* ───────────── Live connections ───────────── */
if (!DEMO) {
  try {   // uploads on/off switch, shared by the home page and admin
    fb.firestore().collection("config").doc("site").onSnapshot(doc => {
      S.uploadsOpen = !doc.exists || doc.data().uploadsEnabled !== false; render();
    }, () => { S.uploadsOpen = true; render(); });
  } catch (e) {}
  if (S.page === "album") fb.firestore().collection("featured").orderBy("at", "desc").limit(60).get()
    .then(snap => { S.featured = snap.docs.map(d => Object.assign({ id: d.id }, d.data())); render(); }).catch(() => {});
  if (typeof fb.auth === "function") fb.auth().onAuthStateChanged(u => {
    if (S.page === "admin") {
      const real = u && !u.isAnonymous;     // a visitor's anonymous upload identity is not an admin login
      A.user = real ? u : null; render();
      if (real) { loadPhotos(); loadSignups(); }
    } else { S.anon = u; if (!u) fb.auth().signInAnonymously().catch(() => {}); }
  });
}

render();
if (location.hash) setTimeout(() => scrollToId(location.hash.slice(1)), 50);
})();
