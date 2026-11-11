/*
 * The invite engine. One static player for every collection and every couple.
 *
 * The page that loads it sets window.SAATH = { root, data } (web/src/lib/server/invite-html.ts):
 * the couple's record, and where the themes live. It reads the collection's
 * themes/<id>/theme.json (the couple's choice, or ?t=<id> to try another), then draws the
 * opening, the hero and every section the couple has filled in. A section with nothing to
 * show is left out entirely. ?f=<family> greets one family and shows only the functions
 * that family is invited to; ?lang=hi|en picks the language. In the builder's preview
 * (SAATH.draft), the record comes from this browser and the page keeps its place on reload.
 */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const params = new URLSearchParams(location.search);
  const SAATH = window.SAATH || {};
  const ROOT = SAATH.root || "";
  const slug = (params.get("c") || "demo").replace(/[^a-z0-9-]/gi, "");
  // Photos and voice notes come from the website as absolute URLs; older records name files beside the couple.
  const media = (src) => (/^(data:|blob:|https?:|\/)/.test(src) ? src : `${ROOT}couples/${slug}/${src}`);
  // The family: from the page (a family's own link, i/<slug>/<key>, resolved by the site), or ?f=.
  const familyParam = (SAATH.family || params.get("f") || "").trim().slice(0, 40);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // The opening words never start higher than this share of the painting's height.
  const TOP_ROOM = 0.075;

  // ───────── Words ─────────
  // A name in the words around it: "the Sharma family" after "For" or "From", a person's name and
  // "Rakesh Roy & family" as they are, and "family" as परिवार on a Hindi page.
  const theFam = (f) => (/\sfamily$/i.test(f) && !/(&|\band)\s+family$/i.test(f) ? `the ${f}` : f);
  const hiFam = (f) => f.replace(/\s+family$/i, " परिवार");
  const UI = {
    en: {
      dear: (f) => `Dear ${f}`, dearSub: "you are warmly invited",
      invited: "You're invited", invitedSub: (c) => `to a wedding in ${c}`,
      hint: { envelope: "Tap the seal to open", doors: "Tap the doors to open", curtains: "Tap to open the curtains", newspaper: "Tap to read the news", lotus: "Press and hold the lotus", lamp: "Tap the lamp to light it", chandelier: "Tap to light the hall" },
      openLabel: "Open the invitation",
      welcome: "Welcome to the wedding of", amp: "&", down: "Scroll down",
      today: (n, t, p) => `Today: ${n} at ${t}${p ? `, ${p}` : ""}`,
      dateT: "The Date", scratch: "Scratch to reveal the date", revealing: "Revealing the date", day: "Day", month: "Month", year: "Year", date: "Date",
      scratchLabel: (u) => `Scratch to reveal the ${u.toLowerCase()}`, revealed: (u, v) => `${u}: ${v}`,
      whenLine: (wd, time) => `${wd}, at ${time}`, addCal: "Add to calendar",
      blessing: "With the blessings of our elders, you are invited to the wedding of",
      ownVoice: "Together with our families, we invite you to our wedding",
      daughter: "Daughter of", son: "Son of", with: "&", close: "",
      dearAll: "Dear friends and family",
      storyT: "Our story", photosT: "Us, so far", swipe: "Swipe to see more",
      eventsT: "The celebrations",
      countT: "The celebration begins", units: ["Days", "Hours", "Minutes", "Seconds"],
      countTo: (n, d) => `until the ${n}, on ${d}`,
      venueT: "Location", maps: "Open in Google Maps", mapTitle: (v) => `Map of ${v}`, showMap: "Show the map", directions: "Directions",
      travelT: "Getting there", stayT: "Where to stay",
      dressT: "Dress code", dressLede: "A colour for each function, if you'd like a hint.",
      familyT: "Our families", blessT: "With the blessings of", darshan: "Eager to see you", swagat: "Waiting to welcome you", kids: "Don't you dare miss it",
      kidsLine: (k) => `${k} say: you must come to the wedding!`,
      songT: "Our song", songPlay: "Play our song", songFrom: (s) => `Plays on ${s}`,
      voiceT: "A word from our parents", voicePlay: "Listen",
      rsvpT: "Will you join us?", rsvpLede: (d) => `Please let us know how many of you are coming to each function, by ${d}.`,
      familyLabel: "Your name", familyPh: "e.g. Shreya Sharma",
      fewer: (n) => `One fewer for ${n}`, more: (n) => `One more for ${n}`,
      send: "Send your reply",
      rsvpNote: "Your reply reaches them as soon as you send it, and WhatsApp opens with it written out too.",
      needFamily: "Add your name, so they know who's coming.",
      confirmT: "Your reply", confirmFrom: (f) => `From ${theFam(f)}`, notComing: "Not coming",
      confirmNote: (c) => `It goes to ${c} as soon as you send it. WhatsApp opens with it written out too.`,
      confirmSend: "Send", confirmBack: "Change",
      doneT: "Thank you", doneLine: (c) => `Your reply has reached ${c}.`, doneChange: "Change your reply",
      saveFailed: "Your reply didn't reach them from here. Press send in WhatsApp so they still get it.",
      // Without the RSVP manager, the reply goes on WhatsApp only.
      waSend: "Send on WhatsApp", waNote: "This opens WhatsApp with your reply written out. Nothing is sent until you press send.",
      waConfirmNote: (c) => `WhatsApp opens with it written out. Press send there and it reaches ${c}.`, waConfirmSend: "Open WhatsApp",
      contactsT: "If you need anything", call: "Call",
      shagunT: "Shagun", shagunLede: "If you'd like to send your blessings from afar.", pay: "Send by UPI",
      upiK: "UPI ID", upiTap: "Tap to copy", upiCopied: "Copied", upiCopy: "Copy the UPI ID",
      thanksT: "Thank you", thanksLede: "For coming, for every blessing, and for making it ours.",
      made: "Invite made with", langSwitch: "म",
      waIntro: (f, c) => `Namaste! RSVP${f ? ` from ${theFam(f)}` : ""} for ${c}'s wedding:`,
      locale: "en-IN",
    },
    mr: {
      dear: (f) => `प्रिय ${f}`, dearSub: "आपले मनःपूर्वक स्वागत",
      invited: "आपण आमंत्रित आहात", invitedSub: (c) => `${c} येथील लग्नासाठी`,
      hint: { envelope: "उघडण्यासाठी शिक्का दाबा", doors: "उघडण्यासाठी दारे दाबा", curtains: "पडदा उघडण्यासाठी दाबा", newspaper: "बातमी वाचण्यासाठी दाबा", lotus: "कमळ दाबून धरा", lamp: "दिवा लावण्यासाठी दाबा", chandelier: "दिवे लावण्यासाठी दाबा" },
      openLabel: "निमंत्रण उघडा",
      welcome: "यांच्या लग्नात स्वागत", amp: "आणि", down: "खाली सरका",
      today: (n, t, p) => `आज: ${n}, ${t}${p ? `, ${p}` : ""}`,
      dateT: "मुहूर्त", scratch: "तारीख पाहण्यासाठी खरडून काढा", revealing: "तारीख उघडत आहोत", day: "दिवस", month: "महिना", year: "वर्ष", date: "तारीख",
      scratchLabel: (u) => `${u} पाहण्यासाठी खरडून काढा`, revealed: (u, v) => `${u}: ${v}`,
      whenLine: (wd, time) => `${wd}, ${time}`, addCal: "कॅलेंडरमध्ये जोडा",
      blessing: "मोठ्यांच्या आशीर्वादाने, आपण यांच्या लग्नाला आमंत्रित आहात",
      ownVoice: "आमच्या कुटुंबांसह, आम्ही तुम्हाला आमच्या लग्नाला आमंत्रित करतो",
      daughter: "यांच्या कन्या", son: "यांचा पुत्र", with: "&", close: "",
      dearAll: "प्रिय नातेवाईक आणि मित्र",
      storyT: "आमची गोष्ट", photosT: "आतापर्यंत", swipe: "अजून पाहण्यासाठी सरका",
      eventsT: "समारंभ",
      countT: "समारंभ सुरू होण्यास", units: ["दिवस", "तास", "मिनिटे", "सेकंद"],
      countTo: (n, d) => `${d} रोजी ${n} पर्यंत`,
      venueT: "स्थळ", maps: "गुगल मॅपमध्ये उघडा", mapTitle: (v) => `${v} चा नकाशा`, showMap: "नकाशा दाखवा", directions: "रस्ता",
      travelT: "कसे पोहोचाल", stayT: "कुठे राहाल",
      dressT: "पोशाख", dressLede: "प्रत्येक कार्यक्रमासाठी एक रंग, जर थोडा इशारा हवा असेल.",
      familyT: "आमची कुटुंबे", blessT: "यांच्या आशीर्वादाने", darshan: "तुम्हाला भेटण्याची इच्छा", swagat: "स्वागतासाठी उत्सुक", kids: "चुकवू नका",
      kidsLine: (k) => `${k} म्हणतात: लग्नाला नक्की या!`,
      songT: "आमचे गाणे", songPlay: "आमचे गाणे ऐका", songFrom: (s) => `${s} वर ऐका`,
      voiceT: "आमच्या आई-वडिलांकडून", voicePlay: "ऐका",
      rsvpT: "तुम्ही येणार का?", rsvpLede: (d) => `कृपया ${d} पर्यंत कळवा, प्रत्येक कार्यक्रमात तुमच्यापैकी किती जण येणार.`,
      familyLabel: "तुमचे नाव", familyPh: "उदा. श्रेया शर्मा",
      fewer: (n) => `${n} साठी एक कमी`, more: (n) => `${n} साठी एक जास्त`,
      send: "उत्तर पाठवा",
      rsvpNote: "पाठवताच तुमचे उत्तर त्यांच्यापर्यंत पोहोचेल, आणि व्हॉट्सअॅपमध्येही ते लिहून उघडेल.",
      needFamily: "तुमचे नाव लिहा, म्हणजे कोण येणार हे त्यांना कळेल.",
      confirmT: "तुमचे उत्तर", confirmFrom: (f) => `${f} कडून`, notComing: "येऊ शकणार नाही",
      confirmNote: (c) => `पाठवताच हे ${c} पर्यंत पोहोचेल. व्हॉट्सअॅपमध्येही ते लिहून उघडेल.`,
      confirmSend: "पाठवा", confirmBack: "बदला",
      doneT: "धन्यवाद", doneLine: (c) => `तुमचे उत्तर ${c} पर्यंत पोहोचले आहे.`, doneChange: "उत्तर बदला",
      saveFailed: "तुमचे उत्तर इथून पोहोचले नाही. व्हॉट्सअॅपमध्ये पाठवा दाबा, म्हणजे त्यांना मिळेल.",
      waSend: "व्हॉट्सअॅपवर पाठवा", waNote: "यामुळे व्हॉट्सअॅपमध्ये तुमचे उत्तर लिहून उघडेल. पाठवा दाबेपर्यंत काही जात नाही.",
      waConfirmNote: (c) => `व्हॉट्सअॅपमध्ये हे लिहून उघडेल. तिथे पाठवा दाबा, म्हणजे हे ${c} पर्यंत पोहोचेल.`, waConfirmSend: "व्हॉट्सअॅप उघडा",
      contactsT: "काही हवे असल्यास", call: "कॉल करा",
      shagunT: "शगुन", shagunLede: "दूरून आशीर्वाद पाठवायचे असल्यास.", pay: "UPI ने पाठवा",
      upiK: "UPI आयडी", upiTap: "कॉपी करण्यासाठी दाबा", upiCopied: "कॉपी झाले", upiCopy: "UPI आयडी कॉपी करा",
      thanksT: "धन्यवाद", thanksLede: "आल्याबद्दल, प्रत्येक आशीर्वादाबद्दल, आणि हा दिवस आमचा केल्याबद्दल.",
      made: "निमंत्रण बनवले", langSwitch: "EN",
      waIntro: (f, c) => `नमस्कार! ${c} च्या लग्नासाठी${f ? ` ${f} चे` : ""} उत्तर:`,
      locale: "mr-IN",
    },
  };

  // Community packs: the invocation and how the card speaks. Each is checked against
  // published cards before a pack goes live.
  const PACKS = {
    "north-hindu": { invocation: "॥ श्री गणेशाय नमः ॥" },
    marwari: { invocation: "॥ श्री गणेशाय नमः ॥" },
    gujarati: { invocation: "॥ श्री गणेशाय नमः ॥" },
    marathi: { invocation: "॥ श्री गणेशाय नमः ॥" },
    tamil: { invocation: "உ" },
    bengali: { invocation: "শ্রী শ্রী প্রজাপতয়ে নমঃ" },
    muslim: { invocation: "بسم الله الرحمن الرحيم" },
    sikh: { invocation: null },
    christian: { invocation: null },
    none: { invocation: null },
  };

  // A function's slot (its painting and colour), from the name guests see, then from its id: one
  // added in the editor has an id like "event-mf2k1", so its name is all there is (a couple's
  // Sangeet showed the wedding's painting, 31 October 2026). The first pattern names the slot, the
  // second something held in its place (a cocktail night in the sangeet's). Kept the same in
  // cards.js and walk/walk.js.
  // The Bengali names too (1 November 2026): the gaye holud, the biye, the bou bhaat and the
  // aashirbad, which takes the engagement's painting.
  const SLOTS = [
    ["haldi", /haldi|हल्दी|holud|हलुद/, /pithi|पीठी|ubtan|\btel\b|telbaan/],
    ["mehendi", /mehe?ndi|mehandi|मेहंदी|मेंहदी|मेहँदी/, /henna|\balta\b/],
    ["sangeet", /sangeet|sangit|संगीत/, /garba|dandiya|cocktail|mehfil/],
    ["reception", /reception|रिसेप्शन|bou ?bh?aa?t|bow ?bh?aa?t|बौभात/, /walima|valima|dinner|banquet|feast|भोज/],
  ];
  // Some themes paint the roka, the engagement and a pool party too (Parda's, 31 October 2026), and
  // the baraat's ghodi and the sehra bandi (Zardozi's, 3 November 2026, for a North Indian groom's family),
  // and the dinner's feast (Zardozi's, 4 November 2026): a theme without one holds a dinner in the reception's place.
  const OWN = [
    ["roka", /roka|रोका/],
    ["engagement", /engag|sagai|सगाई|mangni|मंगनी/, /\bring\b|sakhar|nichay|aa?shirbaa?d|आशीर्वाद/],
    ["pool", /pool|swim|पूल|स्विम/],
    ["baraat", /ba+ra+t|बारात|ghu[dr]+ ?cha[dr]+h?i|gho[dr]i|घुड़चढ़ी|घोड़ी/],
    ["sehra", /sehe?ra|सेहरा/],
    ["dinner", /dinner|banquet|feast|भोज/],
  ];
  const WEDDING = /wedding|shaadi|shadi|vivah|nikah|phera|lagan|anand|mandap|biye|bibaha?o?|शादी|विवाह|निकाह|फेरे|मंडप|बिये/;
  const nameOf = (e) => `${e.name?.en || ""} ${e.name?.hi || ""}`.toLowerCase();
  const findIn = (list, s) => { for (const [k, a, b] of list) { if (a.test(s)) return [k, 0]; if (b?.test(s)) return [k, 1]; } return null; };
  // A function's Hindi name is kept only while it names the same function as its English one. The
  // usual functions start with their Hindi, the editor hides it while Hindi is off, and couples who
  // renamed the Wedding to their Gaaye Holud in English got विवाह under it (3 November 2026). Kept
  // the same in cards.js and walk/walk.js.
  const FN_WORDS = [...SLOTS, ...OWN, ["wedding", WEDDING], ["haldi", /halad|हळद/], ["reception", /स्वागत|वलीमा/], ["wedding", /phere|muhurt|मुहूर्त|आनंद कारज/], ["engagement", /निश्चय|sagaa+i|sagaee/]];
  const fnOf = (s) => findIn(FN_WORDS, (s || "").toLowerCase())?.[0] || "";
  // A Hindi name for several functions is kept when the English names any of them: Surabhi's "Baraat
  // Swagat, Varmala and Pheras" lost its "बरात स्वागत, वरमाला और फेरे", since the English named the
  // baraat first and the Hindi the pheras (5 November 2026). One for a single function still has to
  // name the English one's first, so "Wedding Reception" keeps hiding a विवाह left from "Wedding".
  // "Phere" is the wedding here only: as a slot it would move four invites' wedding time.
  const fnsOf = (s) => { const t = (s || "").toLowerCase(); return new Set(FN_WORDS.filter(([, a, b]) => a.test(t) || b?.test(t)).map(([k]) => k)); };
  const ownHi = (e) => { const hi = fnsOf(e?.name?.hi); if (hi.size < 2) return !hi.size || hi.has(fnOf(e.name.en)); const en = fnsOf(e.name.en); return [...hi].some((k) => en.has(k)); };
  // [slot, how sure]: 0 named for it, 1 held in its place, 2 only its id says so, 3 nothing does
  // (the wedding's slot). A name always beats an id: a couple who renamed the template's Sangeet to
  // their pool party mean the pool party (31 October 2026).
  const slotOf = (e) => {
    const n = nameOf(e), id = (e.id || "").toLowerCase();
    const byId = findIn(SLOTS, id) || (WEDDING.test(id) ? ["wedding"] : null);
    return findIn(SLOTS, n) || (WEDDING.test(n) ? ["wedding", 0] : null) || (byId ? [byId[0], 2] : ["wedding", 3]);
  };
  // Takes the function (or, as layouts may still pass, its id).
  const SLOT_FOR = (e) => slotOf(typeof e === "string" ? { id: e } : e || {})[0];

  // Which painting each function shows, never one twice on an invite (Gautam, 31 October 2026). A
  // painting the couple chose in the editor (event.art: "pool", "motif" …) is theirs, even twice.
  // Every other function asks for its own (the roka's, the engagement's or the pool party's where
  // the theme paints one, else its slot's), and one named for it is served before one held in its
  // place or with no slot of its own, and the template's own function (its id is the slot) before one
  // the couple added. Whoever finds theirs taken gets the theme's second painting for it if there is
  // one (Parda's "haldi2", for a couple's second haldi, 31 October 2026), else its nearest if that's
  // free (the reception's for a cocktail night), else the theme's motif, which the guest page shows
  // nowhere else, else any painting not yet shown. Past that, the ornament. cards.js gives each
  // function's card the same painting, so pass it every function, as here.
  const NEAR = { haldi: "mehendi", mehendi: "haldi", sangeet: "reception", reception: "sangeet", roka: "engagement", engagement: "roka", dinner: "reception" };
  const fnArt = (evs) => {
    const fn = { ...theme.art?.fn, ...(theme.art?.motif ? { motif: theme.art.motif } : {}) };
    const asks = evs.filter((e) => nameOf(e).trim() && e.start).map((e) => {
      const [slot, sure] = slotOf(e);
      const own = findIn(OWN, nameOf(e)) || findIn(OWN, (e.id || "").toLowerCase());
      return own && fn[own[0]] ? { e, slot, key: own[0], sure: own[1] } : { e, slot, key: slot, sure };
    }).sort((a, b) => a.sure - b.sure || (b.e.id === b.key) - (a.e.id === a.key) || new Date(a.e.start) - new Date(b.e.start));
    const out = new Map(), used = new Set();
    const give = (a, k) => { out.set(a.e, fn[k]); used.add(k); };
    for (const a of asks) if (typeof a.e.art === "string" && Object.hasOwn(fn, a.e.art)) give(a, a.e.art);
    for (const a of asks) if (!out.has(a.e) && fn[a.key] && !used.has(a.key)) give(a, a.key);
    for (const a of asks) {
      if (out.has(a.e)) continue;
      // The pool party's and the dinner's paintings only ever go to their own function, or where the couple put them.
      const k = [`${a.key}2`, NEAR[a.key], "motif", ...Object.keys(fn).filter((x) => x !== "pool" && x !== "dinner")].find((x) => fn[x] && !used.has(x));
      if (k) give(a, k);
    }
    return out;
  };

  const ORN = `<svg class="orn" viewBox="0 0 150 14" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width=".8"><path d="M6 7h50M94 7h50"/><path d="M75 1.6 80.4 7 75 12.4 69.6 7Z"/><path d="M56 7c3-3.4 6-3.4 8 0-2 3.4-5 3.4-8 0ZM94 7c-3-3.4-6-3.4-8 0 2 3.4 5 3.4 8 0Z"/></g><circle cx="75" cy="7" r="1.5" fill="currentColor"/><circle cx="3" cy="7" r="1" fill="currentColor"/><circle cx="147" cy="7" r="1" fill="currentColor"/></svg>`;
  const WA = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3 1 2.5c.1.1 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.4-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.4-.3Z"/></svg>`;
  const CHEVRON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>`;
  const PLAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>`;

  let data, theme, base, lang, family, group, opened = false, countTimer = 0;
  // Two things about the couple in the order they chose: the bride's first, or the groom's when
  // their family writes it that way (data.groomFirst, Gautam, 30 October 2026).
  const two = (hers, his) => (data?.groomFirst ? [his, hers] : [hers, his]);
  // A theme with its own page shape (a newspaper, a scrapbook, a journey) brings a layout from
  // invite/layouts/: its first screen, and sections it adds or dresses. null for painted themes.
  let LAY = null;
  const revealed = new Set();

  // What the invite is for (data.occasion): the wedding (absent), an engagement or roka, a
  // save-the-date, or one or two functions on their own. It changes only the words that name the
  // occasion, and a save-the-date leaves out what waits for the invitation.
  const occasion = () => (["engagement", "save-the-date", "function"].includes(data?.occasion) ? data.occasion : "wedding");
  // A function invite names its functions: "Haldi & Mehendi", "हल्दी एवं मेहंदी". More than two are "the celebrations".
  const fnNames = () => {
    const n = [...events()].sort((a, b) => new Date(a.start) - new Date(b.start)).map((e) => pick(e.name)).filter(Boolean);
    if (n.length > 2) return lang === "mr" ? "समारंभ" : "celebrations";
    return n.length > 1 ? `${n[0]} ${lang === "mr" ? "आणि" : "&"} ${n[1]}` : n[0] || (lang === "mr" ? "समारंभ" : "celebrations");
  };
  const OCC = {
    en: {
      engagement: () => ({
        invitedSub: (c) => `to an engagement in ${c}`, welcome: "Welcome to the engagement of",
        blessing: "With the blessings of our elders, you are invited to the engagement of", ownVoice: "Together with our families, we invite you to our engagement",
        kidsLine: (k) => `${k} say: you must come to the engagement!`, thanksLede: "For coming, for every blessing, and for making the day ours.",
        waIntro: (f, c) => `Namaste! RSVP${f ? ` from ${theFam(f)}` : ""} for ${c}'s engagement:`,
      }),
      function: (n) => ({
        invitedSub: (c) => `to the ${n} in ${c}`, welcome: `Welcome to the ${n} of`,
        blessing: `With the blessings of our elders, you are invited to the ${n} of`, ownVoice: `Together with our families, we invite you to our ${n}`,
        kidsLine: (k) => `${k} say: you must come to the ${n}!`,
        waIntro: (f, c) => `Namaste! RSVP${f ? ` from ${theFam(f)}` : ""} for ${c}'s ${n}:`,
      }),
      "save-the-date": () => ({
        invited: "Save the date", invitedSub: (c) => `for a wedding in ${c}`, welcome: "Save the date for the wedding of",
        blessing: "With the blessings of our elders, please save the date for the wedding of", ownVoice: "Please save the date for our wedding",
        follow: "Invitation to follow", countT: "Counting the days", countTo: (n, d) => `until the wedding, on ${d}`,
      }),
    },
    mr: {
      engagement: () => ({
        invitedSub: (c) => `${c} येथील साखरपुड्यासाठी`, welcome: "साखरपुड्याचे स्वागत",
        ownVoice: "आमच्या कुटुंबांसह, आम्ही तुम्हाला आमच्या साखरपुड्याला आमंत्रित करतो", close: "यांच्या साखरपुड्याला आपण सपरिवार आमंत्रित आहात.",
        kidsLine: (k) => `${k} म्हणतात: साखरपुड्याला नक्की या!`,
        waIntro: (f, c) => `नमस्कार! ${c} च्या साखरपुड्यासाठी${f ? ` ${f} चे` : ""} उत्तर:`,
      }),
      function: (n) => ({
        invitedSub: (c) => `${c} येथील ${n} साठी`, welcome: n,
        ownVoice: `आमच्या कुटुंबांसह, आम्ही तुम्हाला आमच्या ${n} ला आमंत्रित करतो`, close: `यांच्या ${n} ला आपण सपरिवार आमंत्रित आहात.`,
        kidsLine: (k) => `${k} म्हणतात: ${n} ला नक्की या!`,
        waIntro: (f, c) => `नमस्कार! ${c} च्या ${n} साठी${f ? ` ${f} चे` : ""} उत्तर:`,
      }),
      "save-the-date": () => ({
        invited: "तारीख जपून ठेवा", invitedSub: (c) => `${c} येथील लग्नासाठी`, welcome: "लग्नाची तारीख",
        ownVoice: "कृपया आमच्या लग्नाची तारीख जपून ठेवा", close: "यांच्या लग्नाची तारीख कृपया जपून ठेवा.",
        follow: "निमंत्रण लवकरच", countT: "दिवस मोजत आहोत", countTo: (n, d) => `${d} रोजी लग्नापर्यंत`,
      }),
    },
  };
  // The words for this language and occasion, made once per language (the record never changes on a page).
  let ui = null;
  const t = () => {
    if (!data || group === undefined) return UI[lang];
    if (ui?.lang !== lang) {
      const words = { ...UI[lang], ...(OCC[lang][occasion()]?.(fnNames()) || {}) };
      // The couple's own, over ours (WORDS in lib/wedding.ts). The invitation's first line is one
      // line whether or not their parents are named, and the children's line is theirs whole.
      for (const k of OWN_WORDS) if (own(k)) words[k] = own(k);
      if (own("inviteLine")) words.blessing = words.ownVoice = own("inviteLine");
      if (own("kidsLine")) words.kidsLine = () => own("kidsLine");
      ui = { lang, words };
    }
    return ui.words;
  };
  const OWN_WORDS = ["welcome", "with", "dearAll", "dateT", "storyT", "photosT", "eventsT", "countT", "venueT", "travelT", "stayT", "dressT", "dressLede", "songT", "rsvpT", "contactsT", "shagunT", "shagunLede", "thanksT", "thanksLede", "familyT", "blessT", "darshan", "swagat", "kids"];
  const pick =(v) => (v && typeof v === "object" && !Array.isArray(v) ? v[lang] ?? v.en ?? "" : v ?? "");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const fmt = (iso, o) => new Intl.DateTimeFormat(t().locale, { timeZone: "Asia/Kolkata", ...o }).format(new Date(iso));
  // Hindi invitations name the part of the day rather than writing am/pm: सुबह 10:30, शाम 7:00.
  const clock = (iso) => {
    if (lang !== "mr") return fmt(iso, { hour: "numeric", minute: "2-digit" });
    const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso)).split(":").map(Number);
    const part = h < 4 ? "रात्र" : h < 12 ? "सकाळ" : h < 16 ? "दुपार" : h < 20 ? "संध्याकाळ" : "रात्र";
    return `${part} ${h % 12 || 12}:${String(m).padStart(2, "0")}`;
  };
  const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
  const art = (k) => (theme.art?.[k] ? base + theme.art[k] : null);
  // In date order, whatever order the couple added them in: a haldi added last for the 16th came after
  // the wedding on the 20th (31 October 2026). The walk-throughs and the newspaper sort the same way.
  // A function for one family's guests ("side:bride") shows in that family's version, the editor's
  // preview included. A guest's page has no `for`: the server sent only their functions (forGuest).
  const events = () => (data.events || []).filter((e) => e.name && e.start && (!e.for || e.for.includes(group) || e.for.includes(`side:${data.groomFirst ? "groom" : "bride"}`))).sort((a, b) => new Date(a.start) - new Date(b.start));
  const firstEvent = () => [...events()].sort((a, b) => new Date(a.start) - new Date(b.start))[0];
  const lastEvent = () => [...(data.events || [])].sort((a, b) => new Date(b.end || b.start) - new Date(a.end || a.start))[0];
  const afterWedding = () => { const l = lastEvent(); return !!l && Date.now() > new Date(l.end || l.start).getTime() + 6 * 36e5; };
  // The wedding itself: by name first, since a roka, an engagement or a tilak also falls in the wedding slot.
  // An engagement invite's is the engagement (else the roka), a function invite's its first function.
  const mainEvent = () => {
    const evs = data.events || [];
    if (occasion() === "engagement") return evs.find((e) => /engag|sagai|ring|mangni|sakhar|nichay/i.test(e.id || "")) || evs.find((e) => /roka|tilak/i.test(e.id || "")) || lastEvent();
    if (occasion() === "function") return firstEvent() || lastEvent();
    // The function at the wedding date and time the couple gave, else the one that day named for the
    // wedding, else the one that day nearest that time. Only with nothing that day, the wedding by name.
    // Couples who renamed the usual Wedding to their 10 am Gaaye Holud saw 10 am under the scratched
    // date, whatever wedding time they gave (3 November 2026). The usual Wedding counts by its id only
    // while its name says the wedding, or says nothing we know.
    const named = (e) => slotOf(e)[0] === "wedding" && slotOf(e)[1] === 0 && !/roka|engag|sagai|tilak|\bring\b/i.test(nameOf(e));
    const byName = (l) => l.find((e) => /^(wedding|nikah|vivah|shaadi|pheras|lagan|anand)/i.test(e.id || "") && (named(e) || slotOf(e)[1] >= 2)) || [...l].reverse().find(named);
    const at = new Date(data.wedding).getTime(), day = istDay(data.wedding);
    const onDay = day ? evs.filter((e) => istDay(e.start) === day) : [];
    const near = [...onDay].sort((a, b) => Math.abs(new Date(a.start) - at) - Math.abs(new Date(b.start) - at))[0];
    return onDay.find((e) => new Date(e.start).getTime() === at) || byName(onDay) || near || byName(evs) || [...evs].reverse().find((e) => SLOT_FOR(e) === "wedding" && !/roka|engage|sagai|tilak|ring/i.test(e.id || "")) || lastEvent();
  };
  // The day in India a moment falls on, "" for none.
  const istDay = (iso) => { const t = new Date(iso).getTime(); return Number.isFinite(t) ? new Date(t + 19800000).toISOString().slice(0, 10) : ""; };
  // The time beside the wedding date: the one the couple gave under the date, once they've changed it
  // from the start's 7 pm, else that of the function that day (mainEvent). Surabhi gave 10:30 for her
  // pheras and saw the 8:30 of the Baraat Swagat they're part of; nine couples who left the 7 pm had
  // moved only their wedding function's time (5 November 2026). cards.js and walk.js do the same.
  const gaveTime = () => { const t = new Date(data.wedding).getTime(); return Number.isFinite(t) && new Date(t + 19800000).toISOString().slice(11, 16) !== "19:00"; };
  const weddingAt = (m) => (m && istDay(m.start) === istDay(data.wedding) && gaveTime() ? data.wedding : m?.start);
  // The day the invite is for, as the couple gave it: the wedding's, or the engagement's or the
  // function's (the editor names the date for the occasion).
  const mainDate = () => data.wedding;
  // The date the opening shows under the names: none while the guest is about to scratch it off its
  // foil right after, so the opening gives only the town (the video first, on Dipanwita's, 3 November
  // 2026; then every invite, when a couple who bought Ivory said the date under their names and then
  // a card asking to scratch it made no sense, Gautam, 4 November 2026). After the wedding, with
  // nothing to scratch, the date shows.
  const heroDate = () => (afterWedding() ? mainDate() : "");
  // What a save-the-date leaves for the invitation: the functions, the venue, travel, replies.
  const full = () => occasion() !== "save-the-date";
  // The countdown runs to the first function, or on a save-the-date to the wedding itself.
  const countTarget = () => (full() ? firstEvent() : data.wedding ? { name: { en: "" }, start: data.wedding } : null);
  const has =(v) => (Array.isArray(v) ? v.length > 0 : !!pick(v));
  // A function at a venue of its own (a reception across town): its address or map, 2 November 2026.
  const mapOf = (e) => (typeof e?.map === "string" && /^https:\/\//.test(e.map.trim()) ? e.map.trim() : "");
  const ownVenue = (e) => has(e?.address) || !!mapOf(e);
  // The town under a function at the main venue, when others are elsewhere (a Bangalore puja and an
  // Udaipur sangeet), so guests can tell where each is (a bride asked, 4 November 2026).
  const townLine = (e) => (!ownVenue(e) && has(data.city) && (data.events || []).some(ownVenue) ? pick(data.city) : "");
  const STATES = /^(andhra pradesh|arunachal pradesh|assam|bihar|chhattisgarh|goa|gujarat|haryana|himachal pradesh|jharkhand|karnataka|kerala|madhya pradesh|maharashtra|manipur|meghalaya|mizoram|nagaland|odisha|orissa|punjab|rajasthan|sikkim|tamil ?nadu|telangana|tripura|uttar pradesh|uttarakhand|west bengal|jammu (and|&) kashmir|ladakh|india|राजस्थान|कर्नाटक|महाराष्ट्र|उत्तर प्रदेश|मध्य प्रदेश|गुजरात|हरियाणा|पंजाब|बिहार|पश्चिम बंगाल|तमिलनाडु|तेलंगाना|केरल|भारत)$/i;
  // A function at a venue of its own: its town, the last part of its address less the PIN and the
  // state ("…, Bengaluru - 560 114", "…, Gurugram, Haryana 122001"), shown under its place where the
  // address itself is left to the venue section. Nothing for an address without parts or a PIN
  // ("Near the old temple"), or when the last part isn't a short name. walk.js has the same.
  const awayTown = (e) => {
    const a = String(pick(e.address) || "");
    if (!/,|\d{3}\s?\d{3}/.test(a)) return "";
    const parts = a.split(",").map((s) => s.replace(/[\s\-–]*\d[\d\s]*$/, "").trim()).filter(Boolean);
    while (parts.length > 1 && STATES.test(parts[parts.length - 1])) parts.pop();
    const t = (parts[parts.length - 1] || "").replace(/^[\s(]+|[\s.)\]]+$/g, "");
    // A road isn't a town ("…, Chandapura-Anekal Rd").
    if (/\b(rd|road|marg|street|st|lane|highway|nh)\.?$/i.test(t)) return "";
    return t.length <= 24 && !/\d/.test(t) && t.toLowerCase() !== String(pick(e.place) || "").trim().toLowerCase() ? t : "";
  };
  // "Haldi & Wedding", "Haldi, Mehendi & Wedding", "हल्दी एवं विवाह".
  const andList = (l) => { const n = l.filter(Boolean); return n.length > 1 ? `${n.slice(0, -1).join(", ")} ${lang === "mr" ? "आणि" : "&"} ${n.at(-1)}` : n[0] || ""; };
  // The record without the lines the couple left blank: a box typed in and cleared, an "Add a moment"
  // never filled in, a contact with no phone. They drew headings over nothing (2 November 2026), so
  // they're dropped once, here, for every section and layout. tidyWedding in lib/wedding.ts matches.
  function tidy(d) {
    if (!d || typeof d !== "object") return d;
    const filled = (b) => !!b && typeof b === "object" && Object.values(b).some((s) => typeof s === "string" && s.trim());
    const keep = (l, ok) => (Array.isArray(l) ? l.filter((x) => x && ok(x)) : l);
    const fam = d.family && typeof d.family === "object" ? Object.fromEntries(Object.entries(d.family).map(([k, l]) => [k, keep(l, filled)])) : d.family;
    // A function's Hindi name that names another function goes too (ownHi).
    const events = Array.isArray(d.events) ? d.events.map((e) => (e?.name?.hi && !ownHi(e) ? { ...e, name: { en: e.name.en } } : e)) : d.events;
    return { ...d, family: fam, events, timeline: keep(d.timeline, (m) => filled(m.when) || filled(m.what)), travel: keep(d.travel, filled), stay: keep(d.stay, (s) => filled(s.name) || filled(s.note)), contacts: keep(d.contacts, (c) => typeof c.phone === "string" && c.phone.trim()) };
  }
  // The couple's own words for a heading or a line (data.words, 2 November 2026), in this language, or "".
  const own = (k) => { const s = data?.words?.[k]?.[lang]; return typeof s === "string" ? s.trim() : ""; };
  // How a family is greeted (3 November 2026): by the name exactly as the couple wrote it ("Sharma
  // family", "Shreya"), in the page's language. A family added before then (no asTyped) was named by
  // its surname, so "family" follows it, unless the name is a person's ("Shri Ramesh ji"). The site
  // greets the same way (familyGreeting in lib/wedding.ts). The RSVP form starts with the English one,
  // which the couple's Replies tab matches to the family.
  const greetName = (l = lang) => {
    const n = ((l === "mr" && (family?.mr || family?.hi)) || family?.name || "").trim();
    if (!n || family.asTyped || /^(shri|shree|sri|smt\.?|shrimati|dr\.?|mr\.?|mrs\.?|ms\.?|श्री|श्रीमती|डॉ\.?)\s|\s(ji|जी)$/i.test(n)) return n;
    return `${n.replace(/\s+(family|parivar|pariwar|परिवार|कुटुंब)$/i, "")} ${l === "mr" ? "कुटुंब" : "family"}`;
  };
  // Keep "Shri" with the name after it and "&" with the name before it, so lines never break between them.
  const nb = (v) => String(v ?? "").replace(/(^|\s)(Late|Smt\.|Shrimati|Shri|Sri|Shree|Dr\.|Mr\.|Mrs\.|Ms\.|Col\.|Capt\.|Prof\.|श्रीमती|श्री|स्व\.|डॉ\.)\s+/g, "$1$2\u00a0").replace(/\s+(&|एवं|और)\s+/g, "\u00a0$1 ");

  // ───────── Boot ─────────
  async function boot() {
    // The builder previews a draft it keeps in this browser.
    let draft = null;
    if (SAATH.draft || params.has("draft")) { try { draft = JSON.parse(localStorage.getItem("saath-draft") || "null"); } catch {} }
    data = tidy(draft || SAATH.data || (await (await fetch(`${ROOT}couples/${slug}/invite.json`)).json()));
    let themeId = (params.get("t") || data.theme || "jharokha").replace(/[^a-z0-9-]/gi, "");
    let res = await fetch(`${ROOT}themes/${themeId}/theme.json?v=10`);
    // A collection that isn't built yet falls back to the first one that is.
    if (!res.ok) {
      try { themeId = (await (await fetch(`${ROOT}themes/index.json`)).json())[0].id; } catch { themeId = "jharokha"; }
      res = await fetch(`${ROOT}themes/${themeId}/theme.json?v=10`);
    }
    base = `${ROOT}themes/${themeId}/`;
    theme = await res.json();
    if (theme.layout) LAY = await loadLayout(theme.layout);
    const asked = params.get("lang") || data.lang || "en";
    lang = asked === "mr" || asked === "hi" ? "mr" : "en";
    document.documentElement.lang = lang;
    document.body.dataset.theme = theme.id;
    // The builder's preview, loaded again after every edit: no entrance animations (engine.css).
    if (params.has("quiet")) document.documentElement.classList.add("quiet");

    family = data.families?.find((f) => f.name.toLowerCase() === familyParam.toLowerCase()) || (familyParam ? { name: familyParam, group: params.get("g") || "all" } : null);
    group = family?.group || params.get("g") || "all";

    applyTheme();
    renderGate();
    renderHero();
    renderPaper();
    renderToday();
    if (params.has("open")) open(true);
    // ?play=<ms>: the opening plays by itself after that long (the site's hero shows it this way),
    // without music, since nobody has tapped yet.
    else if (params.has("play")) {
      const go = () => setTimeout(() => open(), Math.max(300, Number(params.get("play")) || 1200));
      document.readyState === "complete" ? go() : addEventListener("load", go, { once: true });
    }
    // A link to a section (#rsvp, #celebrations) lands on it once the page is drawn, and again as
    // the pictures above it load and push it down.
    // It scrolls this window only: scrollIntoView would also scroll a site page showing the invite
    // in a frame, pulling the visitor away from wherever they had scrolled to.
    // It keeps the section's scroll-margin, which clears the island inside the site's phone mockup.
    if (params.has("open") && /^#[a-z]+$/.test(location.hash)) {
      const land = () => {
        const el = document.querySelector(location.hash);
        if (el) scrollTo(0, el.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0));
      };
      requestAnimationFrame(land);
      addEventListener("load", land, { once: true });
      setTimeout(land, 1200);
    }
    // The builder reloads its preview on every change, so the preview keeps the couple's place.
    if (SAATH.draft) {
      const y = Number(sessionStorage.getItem("saath-preview-y") || 0);
      if (y && params.has("open")) requestAnimationFrame(() => requestAnimationFrame(() => scrollTo(0, y)));
      addEventListener("scroll", () => sessionStorage.setItem("saath-preview-y", String(Math.round(scrollY))), { passive: true });
    }
    // Recording the video invite: no buttons, and no scroll cue, since the video scrolls itself.
    if (params.has("video")) document.body.classList.add("video");

    $("#skip").addEventListener("click", (e) => {
      e.preventDefault();
      open(true);
      requestAnimationFrame(() => {
        const el = $("#invitation");
        if (el) scrollTo(0, el.getBoundingClientRect().top + scrollY);
      });
    });
    $("#langBtn").addEventListener("click", () => setLang(lang === "en" ? "mr" : "en"));
    $("#soundBtn").addEventListener("click", toggleSound);
    // The music and language buttons step aside while the guest reads down the page and return on the way back up.
    let ly = scrollY;
    addEventListener("scroll", () => {
      const y = scrollY, end = document.documentElement.scrollHeight - innerHeight - 160;
      if (y > ly + 6 && y > 320 && y < end) $("#controls").classList.add("tucked");
      else if (y < ly - 6 || y >= end || y <= 320) $("#controls").classList.remove("tucked");
      ly = y;
    }, { passive: true });
    let rw = innerWidth;
    addEventListener("resize", () => {
      if (Math.abs(innerWidth - rw) < 2) return;
      rw = innerWidth;
      drawArch();
      fitWords();
      fitHero();
    });
  }

  // A script whose capital S is taken from another face (below).
  const CAP_S = { "Pinyon Script": "Allura" };
  function applyTheme() {
    const r = document.documentElement.style;
    const p = theme.palette || {};
    for (const [k, v] of Object.entries(p)) r.setProperty(`--${k}`, v);
    const f = theme.fonts || {};
    // Pinyon Script's capital S reads as a T or an L: relatives read "Saini" wrong on Jatin's invite
    // (31 October 2026). Its S comes from Allura, a script in the same hand, fetched as that one letter
    // (text=S), so every other letter stays Pinyon's. openings.js (the seal) and cards.js do the same.
    const capS = CAP_S[f.script];
    if (f.script) r.setProperty("--script", `${capS ? `"${capS}", ` : ""}"${f.script}", "Tiro Devanagari Hindi", cursive`);
    if (capS && !document.querySelector("link[data-cap-s]")) {
      const l = document.createElement("link");
      l.rel = "stylesheet"; l.dataset.capS = "";
      l.href = `https://fonts.googleapis.com/css2?family=${capS.replace(/ /g, "+")}&text=S&display=swap`;
      document.head.appendChild(l);
    }
    if (f.serif) r.setProperty("--serif", `"${f.serif}", "Tiro Devanagari Hindi", Georgia, serif`);
    if (f.deva) r.setProperty("--deva", `"${f.deva}", "Tiro Devanagari Hindi", serif`);
    if (f.display) r.setProperty("--display", `"${f.display}", "${f.serif || "Cormorant Garamond"}", serif`);
    const families = [...new Set([f.script, f.serif, f.deva, f.display, "Tiro Devanagari Hindi", data.community === "tamil" ? "Noto Serif Tamil" : null, data.community === "bengali" ? "Tiro Bangla" : null].filter(Boolean))];
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${families.map((n) => `family=${encodeURIComponent(n).replace(/%20/g, "+")}:ital,wght@0,400;0,500;0,600;1,400`).join("&")}&display=swap`;
    link.onerror = () => {};
    document.head.appendChild(link);
    // Some families lack italics or weights; a second, plain request covers them.
    const plain = document.createElement("link");
    plain.rel = "stylesheet";
    plain.href = `https://fonts.googleapis.com/css2?${families.map((n) => `family=${encodeURIComponent(n).replace(/%20/g, "+")}`).join("&")}&display=swap`;
    document.head.appendChild(plain);

    if (luminance(p.paper || "#fbf8f2") < 0.35) document.body.classList.add("dark");
    setFoils(p.gold || "#b08d4c", p.paper || "#fbf8f2", p.accent || "#a3122f");
    if (art("paper")) r.setProperty("--paper-tex", `url("${art("paper")}")`);
    if (art("rosette")) r.setProperty("--count-rose", `url("${art("rosette")}")`);
    if (art("archFrame")) r.setProperty("--arch-frame", `url("${art("archFrame")}")`);
    // The couple's own song (kept with their photos), a track from the music library, or the design's
    // own, on a loop. "off": no music and no button.
    if (data.music === "off") $("#soundBtn").style.display = "none";
    else $("#music").src = /^\/api\/wedding\/media\/[0-9a-f-]{36}$/.test(data.music || "") ? data.music : /^music\/[a-z0-9-]+\.mp3$/.test(data.music || "") ? ROOT + data.music : theme.music ? base + encodeURI(theme.music) : `${ROOT}themes/theme.mp3`;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = p.night || p.paper || "#ebe3d5";
  }

  // Gold text must still read on the paper at its lightest stop, and white on gold buttons.
  function setFoils(gold, paper, accent) {
    const rgb = (h) => { const n = parseInt(h.replace("#", "").slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const hex = (c) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
    const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
    const g = rgb(gold), pL = luminance(paper), darkPaper = pL < 0.35;
    const toward = darkPaper ? [255, 248, 230] : [24, 14, 4];
    // The first shade of gold, moving away from the paper, that reaches the contrast asked for.
    const shade = (target, lighten = 0, from = g) => {
      const base = mix(from, [255, 255, 255], lighten);
      for (let t = 0; t <= 1; t += 0.02) { const c = mix(base, toward, t); if (contrast(luminance(hex(c)), pL) >= target) return hex(c); }
      return hex(toward);
    };
    // Any theme colour used for text is moved just far enough from the paper to read (4.6:1).
    ink = (h, target = 4.6) => shade(target, 0, rgb(h));
    const deep = shade(6), mid = shade(4.2), hi = shade(3.4, 0.35);
    const r = document.documentElement.style, b = document.body.style;
    r.setProperty("--foil", `linear-gradient(100deg, ${deep} 0%, ${mid} 22%, ${hi} 38%, ${deep} 55%, ${hi} 72%, ${deep} 100%)`);
    // Set on the body so they win over the stylesheet's dark-mode defaults.
    b.setProperty("--gold-deep", ink(gold));
    b.setProperty("--gold-text", ink(gold));
    b.setProperty("--accent-text", ink(accent));
    // The soft ink (captions, small capitals) is the ink mixed towards the paper: as soft as the
    // paper allows while still reading at 4.6:1 (on a warm yellow paper, 68% isn't enough).
    {
      const ic = rgb(theme.palette?.ink || "#2b1b17"), pc = rgb(paper);
      let soft = hex(ic);
      for (let t = 0.32; t >= 0; t -= 0.02) { const c = hex(mix(ic, pc, t)); if (contrast(luminance(c), pL) >= 4.6) { soft = c; break; } }
      b.setProperty("--ink-soft", soft);
    }
    // A filled band with white text (the "today" banner) needs the accent dark enough for white.
    b.setProperty("--accent-fill", (() => { const a = rgb(accent); for (let t = 0; t <= 1; t += 0.02) { const c = mix(a, [20, 10, 6], t); if (luminance(hex(c)) <= 0.175) return hex(c); } return "#2a1a08"; })());
    // Until the opening's painting loads, the screen shows its top edge's colour above and its bottom edge's below.
    const edge = theme.opening?.edge;
    if (edge) {
      b.setProperty("--gate-top", edge.top || edge);
      b.setProperty("--gate-bottom", edge.bottom || edge);
    }
    // The greeting and the hint sit on the painting in one of two tones: light gold and cream on
    // dark ground, deep gold and ink on light ground (readGate picks one for each).
    const until = (from, to, ok) => { for (let t = 0; t <= 1; t += 0.02) { const c = hex(mix(from, to, t)); if (ok(luminance(c))) return c; } return hex(to); };
    const { ink: inkC = "#574d43", night = "#2a1f18" } = theme.palette || {};
    const lightPaper = luminance(paper) > 0.5 ? paper : "#fbf3e4", darkInk = luminance(inkC) <= 0.1 ? inkC : until(rgb(night), [8, 4, 2], (L) => L <= 0.02);
    const tones = { hi: until(g, [255, 248, 232], (L) => L >= 0.45), cream: hex(mix(rgb(lightPaper), [255, 255, 255], 0.55)), lo: until(g, [24, 14, 4], (L) => L <= 0.1), ink: darkInk };
    for (const [k, v] of Object.entries(tones)) b.setProperty(`--gate-${k}`, v);
    gateTones = { dark: [luminance(tones.hi), luminance(tones.cream)], light: [luminance(tones.lo), luminance(tones.ink)] };
    // Buttons carry white text: every stop stays dark enough for 4.5:1.
    const btn = (maxL, lighten) => { const base = mix(g, [255, 255, 255], lighten); for (let t = 0; t <= 1; t += 0.02) { const c = mix(base, [30, 18, 6], t); if (luminance(hex(c)) <= maxL) return hex(c); } return "#2a1a08"; };
    r.setProperty("--foil-deep", `linear-gradient(100deg, ${btn(0.07, 0)} 0%, ${btn(0.12, 0)} 30%, ${btn(0.175, 0.3)} 48%, ${btn(0.13, 0)} 66%, ${btn(0.07, 0)} 100%)`);
  }

  let ink = (h) => h;
  // The luminance of the opening words in each tone: [greeting, its small line and the hint].
  let gateTones = { dark: [0.5, 0.9], light: [0.08, 0.03] };

  function luminance(hex) {
    const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  // ───────── The opening ─────────
  function renderGate() {
    const u = t();
    if (theme.opening?.edge) $("#gate").dataset.edge = "";
    const sub = theme.opening?.cityLine === false
      ? ({ en: "to a wedding", hi: "शादी के लिए", mr: "लग्नासाठी" }[lang] || "to a wedding")
      : (has(data.city) ? u.invitedSub(pick(data.city)) : "");
    $("#greet").innerHTML = family
      ? `${esc(u.dear(greetName()))}<small>${esc(u.dearSub)}</small>`
      : `${esc(u.invited)}${sub ? `<small>${esc(sub)}</small>` : ""}`;
    $("#greet").lang = lang;
    const type = theme.opening?.type || "envelope";
    // A theme may word its own hint (Genda's marigold strings use the curtains opening).
    $("#hint").textContent = theme.opening?.hint?.[lang] || u.hint[type] || u.openLabel;
    $("#hint").lang = lang;
    // A page that opens at once (?open: the site's previews, the builder) never shows the opening,
    // so it never builds it or fetches its paintings.
    if (!renderGate.mounted && !params.has("open")) {
      renderGate.mounted = true;
      const make = window.SaathOpenings?.[type] || window.SaathOpenings?.reveal;
      const [p1, p2] = two(data.her, data.him);
      const initials = `${[...p1.en][0]}${[...p2.en][0]}`;
      renderGate.ctrl = make({
        stage: $("#stage"), theme, base, initials, reduced, label: u.openLabel,
        // The envelope's seal: the couple's choice (absent: their initials as a pair) and their names,
        // the first-named as "her" for the seal's left letter.
        seal: data.seal || null, couple: { her: p1, him: p2 },
        // What the card that slides out of an envelope says.
        card: { kicker: u.invited, names: lang === "mr" ? [p1.mr || p1.hi || p1.en, p2.mr || p2.hi || p2.en] : [p1.en, p2.en], amp: u.amp, lang },
        // A layout's own first screen, for an opening that hands over to it (the newspaper).
        page: LAY?.hero ? LAY.hero(api()) : "",
        onOpen: () => open(),
      });
      mountGate();
    }
    fitGate();
  }

  // The painting fills the screen, and the greeting and the hint sit on it.
  function mountGate() {
    const gate = $("#gate"), ctrl = renderGate.ctrl;
    if (!ctrl?.box) return;
    // The dim room round the painting on a screen wider than it.
    const fill = document.createElement("div");
    fill.className = "gate-fill";
    fill.setAttribute("aria-hidden", "true");
    gate.prepend(fill);
    // On a phone, the small bands above and below a painting that can't be cropped (Hum Dono's wide
    // envelope) carry on its own edge, mirrored, so the paper or the wood runs on to the screen's edge.
    for (const side of ["top", "bottom"]) {
      const m = document.createElement("div");
      m.className = `gate-mirror ${side}`;
      m.setAttribute("aria-hidden", "true");
      const still = theme.opening?.type === "film" && theme.opening.first ? base + theme.opening.first : art("closed");
      if (still) m.style.backgroundImage = `url("${still}")`;
      fill.after(m);
    }
    // Until the painting is read, each line takes the tone of the edge it sits nearest, lightly frosted.
    const edge = theme.opening?.edge;
    for (const [el, at] of [[$("#greet"), edge?.top || edge], [$("#hint"), edge?.bottom || edge]]) {
      const dark = typeof at === "string" ? luminance(at) < 0.3 : document.body.classList.contains("dark");
      el.classList.toggle("tone-dark", dark);
      el.classList.toggle("tone-light", !dark);
      el.style.setProperty("--frost-rgb", dark ? "0 0 0" : "255 252 244");
      el.style.setProperty("--frost-a", "0.22");
    }
    ctrl.closed?.then((img) => { readGate.img = img; readGate(); }).catch(() => {});
    // The phone turning, a window resized, the browser's bars coming and going.
    if (window.ResizeObserver) new ResizeObserver(() => fitGate()).observe(gate);
    document.fonts?.ready.then(() => fitGate());
  }

  // The painting covers the screen (object-fit: cover). A phone crops its sides, never what the
  // guest touches. A screen wider than the painting may crop up to 12% of its height (a tablet
  // held upright); any wider (a laptop) and the painting shows its whole height in a dim room, so
  // the greeting and the hint keep the bands of sky, wall or water the painting leaves for them
  // (cropping the top pushes the greeting down onto the arch or the tower). A phone that must show
  // a wide focus whole fills the bands above and below with the painting's edge, mirrored.
  // Every layer of the opening is placed in fractions of this box, so the doors, the seal, the
  // pulse, the canvases and the light all move and crop with the painting.
  function fitGate() {
    const gate = $("#gate"), ctrl = renderGate.ctrl, box = ctrl?.box;
    if (!box || gate.hidden) return;
    const W = gate.clientWidth, H = gate.clientHeight;
    if (!W || !H) return;
    const [aw, ah] = String(theme.opening?.aspect || "1024 / 1536").split("/").map(Number);
    const [fx0, fy0, fx1, fy1] = ctrl.focus || [0.25, 0.25, 0.75, 0.75];
    const cover = Math.max(W / aw, H / ah), whole = Math.min(W / aw, H / ah);
    const s = Math.max(whole, Math.min(H / (ah * cover) >= 0.88 ? cover : whole, W / ((fx1 - fx0) * aw)));
    const w = Math.round(aw * s), h = Math.round(ah * s);
    // Along each side: centred, then moved as little as it takes to keep the focus in view.
    const place = (len, view, f0, f1) => {
      if (len <= view + 1) return Math.round((view - len) / 2);
      const at = Math.max(-f0 * len, Math.min((view - len) / 2, view - f1 * len));
      return Math.round(Math.min(0, Math.max(view - len, at)));
    };
    const x = place(w, W, fx0, fx1), y = place(h, H, fy0, fy1);
    Object.assign(box.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
    const framed = w < W - 1 || h < H - 1;
    const mirrored = framed && w >= W - 1 && H - h <= 0.5 * h;
    gate.classList.toggle("framed", framed && !mirrored);
    gate.classList.toggle("mirrored", mirrored);
    if (mirrored) {
      const flip = { width: `${w}px`, left: `${x}px`, backgroundSize: `${w}px ${h}px` };
      Object.assign($(".gate-mirror.top", gate)?.style || {}, flip, { top: "0px", height: `${y + 1}px`, backgroundPosition: "0 0" });
      Object.assign($(".gate-mirror.bottom", gate)?.style || {}, flip, { top: `${y + h - 1}px`, height: `${H - y - h + 1}px`, backgroundPosition: "0 100%" });
    }
    fitGate.at = { x, y, w, h, mirrored };
    readGate();
  }

  // The greeting and the hint are judged on the painting under them, as the hero's words are: light
  // words on dark ground, dark on light, and a frost when the ground is busy. They keep their places
  // (the top of a painting is usually its sky or wall; lower down it gets busier, not calmer).
  function readGate() {
    const gate = $("#gate"), img = readGate.img, at = fitGate.at;
    if (!img?.naturalWidth || !at || opened) return;
    try {
      const W = gate.clientWidth, H = gate.clientHeight, SW = 160, k = SW / W, SH = Math.round(H * k);
      const c = document.createElement("canvas");
      c.width = SW; c.height = SH;
      const g = c.getContext("2d", { willReadFrequently: true });
      if (gate.classList.contains("framed")) {
        g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--night").trim() || "#2a1f18";
        g.fillRect(0, 0, SW, SH);
      }
      g.drawImage(img, at.x * k, at.y * k, at.w * k, at.h * k);
      if (at.mirrored) {
        // The mirrored bands, as fitGate lays them out.
        const nw = img.naturalWidth, nh = img.naturalHeight, top = at.y, bottom = H - at.y - at.h;
        g.save(); g.translate(0, top * k); g.scale(1, -1);
        if (top > 0) g.drawImage(img, 0, 0, nw, (nh * top) / at.h, at.x * k, 0, at.w * k, top * k);
        g.restore();
        g.save(); g.translate(0, (at.y + at.h) * k); g.scale(1, -1);
        if (bottom > 0) g.drawImage(img, 0, nh - (nh * bottom) / at.h, nw, (nh * bottom) / at.h, at.x * k, -bottom * k, at.w * k, bottom * k);
        g.restore();
      }
      const P = pixelsOf(g, SW, SH, k);
      const rect = (el, host) => ({ x: (host?.offsetLeft || 0) + el.offsetLeft, y: (host?.offsetTop || 0) + el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
      // Each line against its own ground: the script greeting needs 3:1, the small lines 4.5:1 (WCAG).
      const judge = (el, lines) => {
        const b = rect(el);
        const whole = zoneStats(P, b.x - 8, b.y - 8, b.w + 16, b.h + 16);
        if (!whole) return null;
        const per = lines.map(([r, need, i]) => [zoneStats(P, r.x, r.y, r.w, r.h), need, i]).filter(([z]) => z);
        const short = (dark) => per.reduce((n, [z, need, i]) => n + Math.max(0, need - (dark ? contrast(gateTones.dark[i], z.p90) : contrast(gateTones.light[i], z.p10))), 0);
        const sl = short(true), sd = short(false), dark = sl <= sd;
        // A thin line of capitals across a busy band is lost even when the box round it is calm.
        return { whole, dark, short: dark ? sl : sd, busy: Math.max(busyOf(whole), ...per.map(([z]) => busyOf(z))) };
      };
      const greet = $("#greet"), small = greet.querySelector("small"), hint = $("#hint");
      const gj = judge(greet, [[rect(greet), 3, 0], ...(small ? [[rect(small, greet), 4.5, 1]] : [])]);
      if (gj) setTone(greet, greet, gj);
      const hj = judge(hint, [[rect(hint), 4.5, 1]]);
      if (hj) setTone(hint, hint, hj);
    } catch (e) { console.warn("gate read", e); }
  }

  function open(instant = false) {
    if (opened) return;
    opened = true;
    if (!instant && !params.has("play")) startMusic();
    const song = $("#songAudio");
    if (song) song.play().then(() => { if (song.dataset.live === "1") return; song.pause(); song.currentTime = 0; }).catch(() => {});
    const gate = $("#gate");
    gate.classList.add("opening");
    const finish = () => {
      document.body.classList.remove("sealed");
      document.body.classList.add("body-open");
      gate.classList.add("gone");
      $("#controls").hidden = false;
      setTimeout(() => (gate.hidden = true), 1000);
    };
    if (instant || reduced) return finish();
    const p = renderGate.ctrl?.play?.();
    (p instanceof Promise ? p : new Promise((r) => setTimeout(r, 1300))).then(finish);
  }

  // ───────── Layouts ─────────
  async function loadLayout(name) {
    const id = String(name).replace(/[^a-z0-9-]/gi, "");
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = `${ROOT}layouts/${id}.css?v=24`;
    document.head.appendChild(css);
    if (id === "keepsake") await new Promise((ok) => { const s = document.createElement("script"); s.src = `${ROOT}layouts/names-hand.js?v=10`; s.onload = s.onerror = ok; document.head.appendChild(s); });
    await new Promise((ok) => { const s = document.createElement("script"); s.src = `${ROOT}layouts/${id}.js?v=13`; s.onload = s.onerror = ok; document.head.appendChild(s); });
    document.body.classList.add(`layout-${id}`);
    return window.SaathLayouts?.[id] || null;
  }
  // What a layout may use: the record, the page's language and the engine's own helpers.
  const api = () => ({
    data, theme, base, ROOT, lang, family, group, u: t(), pick, esc, fmt, clock, art, has, nb, events, firstEvent, mainEvent, mainDate, heroDate, occasion, fnNames, media,
    famName: greetName, divider, sec, SLOT_FOR, two, initials: () => two(data.her?.en?.[0] || "", data.him?.en?.[0] || ""),
  });

  // ───────── The hero ─────────
  function renderHero() {
    const u = t();
    if (LAY?.hero) {
      // The layout draws the first screen itself (a front page, a scrapbook page).
      $("#hero").classList.add("custom");
      let host = $("#layHero");
      if (!host) { host = document.createElement("div"); host.className = "lay-hero"; host.id = "layHero"; $("#hero").appendChild(host); }
      host.innerHTML = LAY.hero(api());
      LAY.mountHero?.(host, api());
      $("#down").innerHTML = `<span>${esc(u.down)}</span>${CHEVRON}`;
      $("#down").lang = lang;
      $("#langBtn").textContent = u.langSwitch;
      $("#langBtn").lang = lang === "en" ? "mr" : "en";
      return;
    }
    const h = theme.art?.heroZone;
    const words = $("#heroWords");
    if (art("hero")) {
      $("#heroArt").src = art("hero");
      $("#heroArt").addEventListener("error", () => $("#hero").classList.add("plain"), { once: true });
    } else $("#hero").classList.add("plain");
    // The words keep their place in the painting, but never sit higher than just under the top
    // inset (the island, inside the site's phone mockup; 0 in a browser), so only paintings that
    // set their names near the very top move down.
    if (h) Object.assign(words.style, { top: `max(${Math.max(h.top, TOP_ROOM) * 100}%, calc(var(--safe-t) + 24px))`, left: `${(h.left ?? 0.15) * 100}%`, right: `${(1 - (h.right ?? 0.85)) * 100}%` });
    $("#hero").classList.toggle("tone-dark", (h?.tone || theme.art?.heroTone) === "dark");
    const names = lang === "mr" ? two(data.her.mr || data.her.hi, data.him.mr || data.him.hi) : two(data.her.en, data.him.en);
    words.innerHTML = `
      <p class="hw-pre" lang="${lang}">${esc(u.welcome)}</p>
      <div class="hw-names"><p class="hw-name" lang="${lang}">${esc(names[0])}</p><p class="hw-amp" lang="${lang}">${esc(u.amp)}</p><p class="hw-name" lang="${lang}">${esc(names[1])}</p></div>
      <span class="hw-rule">${divider()}</span>
      ${mainDate() && (heroDate() || has(data.city)) ? `<p class="hw-date" lang="${lang}">${[heroDate() && esc(fmt(heroDate(), { day: "numeric", month: "long", year: "numeric" })), esc(pick(data.city))].filter(Boolean).join("<br>")}</p>` : ""}`;
    $("#heroArt").alt = "";
    fitHero();
    $("#down").innerHTML = `<span>${esc(u.down)}</span>${CHEVRON}`;
    $("#down").lang = lang;
    $("#langBtn").textContent = u.langSwitch;
    $("#langBtn").lang = lang === "en" ? "mr" : "en";
  }

  // Place the words where the painting is calm, pick the text tone from what is under them,
  // and frost the painting behind them when it is still too busy to read.
  function fitHero() {
    if (LAY?.hero) return;
    const img = $("#heroArt");
    const go = () => requestAnimationFrame(() => { try { readHero(); } catch (e) { console.warn("hero read", e); } });
    img.complete && img.naturalWidth ? go() : img.addEventListener("load", go, { once: true });
    document.fonts?.ready.then(go);
  }

  function heroPixels() {
    const img = $("#heroArt"), r = { width: img.offsetWidth, height: img.offsetHeight };
    if (!img.naturalWidth || !r.width) return null;
    const W = 120, H = Math.round((W * r.height) / r.width);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d", { willReadFrequently: true });
    // object-fit: cover
    const k = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight) * (W / r.width);
    const dw = img.naturalWidth * k, dh = img.naturalHeight * k;
    g.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    return pixelsOf(g, W, H, W / r.width);
  }

  // A small canvas's pixels and their luminance; scale turns CSS pixels into the canvas's.
  function pixelsOf(g, W, H, scale) {
    const px = g.getImageData(0, 0, W, H).data;
    const lum = new Float32Array(W * H);
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    for (let i = 0; i < W * H; i++) lum[i] = 0.2126 * lin(px[i * 4]) + 0.7152 * lin(px[i * 4 + 1]) + 0.0722 * lin(px[i * 4 + 2]);
    return { W, H, lum, px, scale };
  }

  // Mean luminance, its spread and edge density inside a box given in CSS pixels of the hero.
  function zoneStats(P, x, y, w, h) {
    const x0 = Math.max(0, Math.floor(x * P.scale)), y0 = Math.max(0, Math.floor(y * P.scale));
    const x1 = Math.min(P.W - 1, Math.ceil((x + w) * P.scale)), y1 = Math.min(P.H - 1, Math.ceil((y + h) * P.scale));
    let n = 0, sum = 0, sq = 0, edge = 0, rr = 0, gg = 0, bb = 0;
    const all = [];
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      const i = yy * P.W + xx, L = P.lum[i];
      n++; sum += L; sq += L * L; all.push(L);
      edge += Math.abs(L - P.lum[i + 1]) + Math.abs(L - P.lum[i + P.W]);
      rr += P.px[i * 4]; gg += P.px[i * 4 + 1]; bb += P.px[i * 4 + 2];
    }
    if (!n) return null;
    const mean = sum / n;
    all.sort((a, b) => a - b);
    return { mean, sd: Math.sqrt(Math.max(0, sq / n - mean * mean)), edge: edge / n, p10: all[Math.floor(n * 0.1)], p90: all[Math.floor(n * 0.9)], rgb: [rr / n, gg / n, bb / n].map(Math.round) };
  }
  const busyOf = (z) => 10 * z.edge;
  if (params.has("debug")) window.__saath = { heroPixels, zoneStats: (...a) => zoneStats(...a) };
  const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

  function readHero() {
    const hero = $("#hero"), words = $("#heroWords");
    if (hero.classList.contains("plain")) return;
    const P = heroPixels();
    if (!P) return;
    const H = hero.clientHeight, Wd = hero.clientWidth;
    const zone = theme.art?.heroZone;
    words.style.setProperty("--hw-k", "1");
    const box = () => { const r = words.getBoundingClientRect(), h = hero.getBoundingClientRect(); return { x: r.left - h.left, w: r.width, h: r.height }; };
    // The two text tones the theme can show, measured once.
    const toneL = (dark) => {
      hero.classList.toggle("tone-dark", dark);
      hero.classList.toggle("tone-light", !dark);
      const [r, g, b] = getComputedStyle(words.querySelector(".hw-pre") || words).color.match(/[\d.]+/g).map(Number);
      return luminance(`#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`);
    };
    const lightL = toneL(true), darkL = toneL(false);
    // Each line is judged on its own ground: small lines need 4.5:1, the large names 3:1 (WCAG).
    const lines = [[".hw-pre", 4.5], [".hw-names", 3], [".hw-date", 4.5]].map(([q, need]) => [words.querySelector(q), need]).filter(([el]) => el);
    const judge = (b, y) => {
      const whole = zoneStats(P, b.x - 8, y - 8, b.w + 16, b.h + 16);
      if (!whole) return null;
      const per = lines.map(([el, need]) => [zoneStats(P, b.x + el.offsetLeft, y + el.offsetTop, el.offsetWidth, el.offsetHeight), need]).filter(([z]) => z);
      const short = (dark) => per.reduce((n, [z, need]) => n + Math.max(0, need - (dark ? contrast(lightL, z.p90) : contrast(darkL, z.p10))), 0);
      const sl = short(true), sd = short(false), dark = sl <= sd;
      return { whole, dark, short: dark ? sl : sd, busy: busyOf(whole) };
    };
    let best = null;
    // Never under the island inside the site's phone mockup: it ends about 48px down, so the words
    // start at 52px there (the 59px inset also clears the status bar, which the painting may run under).
    // Elsewhere the device's own top inset, which is 0 in a browser tab.
    const inset = document.documentElement.classList.contains("in-phone") ? 52 : parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-t")) || 0;
    // And always some room above them: at least 7.5% of the painting from its top edge, and under an
    // island or notch a further 4% (founders, 21 October 2026: the names sat too close to the top).
    const room = Math.max(TOP_ROOM * H, inset ? inset + 0.04 * H : 0);
    // A long name in a script face is one word that can't wrap (Siddharthvardhan): cap the scale so
    // the longest name fits its line, else it runs off the screen.
    words.classList.remove("hw-inline");
    let kMax = 1;
    const wide = () => [...words.querySelectorAll(".hw-name")].some((n) => n.scrollWidth > words.clientWidth + 1);
    while (wide() && kMax > 0.45) { kMax -= 0.04; words.style.setProperty("--hw-k", kMax.toFixed(2)); }
    const tries = [[false, 1], [false, 0.88], [true, 1], [false, 0.76], [true, 0.88], [true, 0.76], [false, 0.66], [true, 0.66]]
      .map(([inline, k]) => [inline, Math.min(k, kMax)]);
    // A theme's calm zone, when given, holds the words; otherwise (or if nothing fits it) search the upper two thirds.
    const search = (inZone, floor = room, slack = 0) => { for (const [inline, k] of tries) {
      words.classList.toggle("hw-inline", inline);
      words.style.setProperty("--hw-k", String(k));
      if (inline) { const row = words.querySelector(".hw-names"); if (row.scrollWidth > words.clientWidth + 1) continue; }
      const b = box();
      const lo = Math.max(inZone ? zone.top * H : 0.04 * H, floor), hi = inZone ? (zone.bottom + slack) * H - b.h : Math.min(0.66 * H, H - b.h - 0.1 * H);
      if (hi < lo) continue;
      for (let y = lo; y <= hi + 0.5; y += Math.max(2, H * 0.01)) {
        const j = judge(b, y);
        if (!j) continue;
        // Calm ground first, then enough contrast on every line, then larger words placed higher.
        // A small shortfall is cured by a light frost; a large one means the words are in the wrong place.
        const score = j.busy + (j.short <= 0.8 ? 0.04 : 0.12) * j.short + 0.06 * (y / H) + 0.25 * (1 - k) + (inline ? 0.02 : 0);
        if (!best || score < best.score) best = { y, k, inline, j, score };
      }
      if (best && best.j.busy < 0.2 && best.j.short <= 0.8) break;
    } };
    if (zone?.bottom) search(true);
    // Words that don't fit the calm zone with that room (long names, or the phone's island) may run
    // a little past its bottom, then sit just under the inset, before they leave the zone to cover
    // the painting.
    if (!best && zone?.bottom) search(true, room, 0.035);
    if (!best && zone?.bottom && room > inset) search(true, inset);
    if (!best) search(false);
    if (!best) return;
    words.classList.toggle("hw-inline", !!best.inline);
    words.style.setProperty("--hw-k", String(best.k));
    words.style.top = `${(best.y / H) * 100}%`;
    setTone(hero, words, best.j);
  }

  // Light text on dark ground, dark text on light ground; frost the ground when contrast or calm is short.
  function setTone(host, el, j) {
    const { whole: z, dark, short, busy } = j;
    host.classList.toggle("tone-dark", dark);
    host.classList.toggle("tone-light", !dark);
    const need = Math.max(0, Math.min(1, Math.max((busy - 0.2) / 0.3, short / 2.5)));
    const [r, g, b] = z.rgb;
    // The frost takes the painting's own colour, pushed towards paper or night.
    const mix = dark ? [r * 0.45, g * 0.45, b * 0.5] : [r + (255 - r) * 0.6, g + (255 - g) * 0.6, b + (255 - b) * 0.55];
    el.style.setProperty("--frost-rgb", mix.map(Math.round).join(" "));
    el.style.setProperty("--frost-a", need ? (0.15 + 0.45 * need).toFixed(2) : "0");
    el.style.setProperty("--frost-blur", need ? `${Math.round(6 + 10 * need)}px` : "0px");
    el.dataset.read = JSON.stringify({ L: +z.mean.toFixed(3), busy: +busy.toFixed(3), short: +short.toFixed(2), need: +need.toFixed(2) });
  }

  function renderToday() {
    const today = dayKey(new Date());
    const now = events().find((e) => dayKey(new Date(e.start)) === today);
    const bar = $("#today");
    if (!now) return (bar.hidden = true);
    bar.hidden = false;
    bar.lang = lang;
    bar.textContent = t().today(pick(now.name), clock(now.start), pick(now.place));
  }

  function divider() {
    return art("divider") ? `<img class="divider-art" src="${art("divider")}" alt="" aria-hidden="true">` : ORN;
  }

  // ───────── Sections ─────────
  const SECTIONS = [
    { id: "note", when: () => has(family?.note), html: secNote },
    { id: "date", when: () => !!mainDate() && !afterWedding(), html: secDate },
    { id: "invitation", when: () => true, html: secInvitation },
    { id: "story", when: () => has(data.story) || has(data.timeline), html: secStory },
    { id: "photos", when: () => has(data.photos), html: secPhotos },
    { id: "celebrations", when: () => full() && events().length > 0, html: secEvents },
    { id: "countdown", when: () => !!countTarget() && new Date(countTarget().start) > Date.now(), html: secCountdown },
    { id: "venue", when: () => full() && (has(data.venue?.name) || has(data.venue?.address) || events().some(ownVenue)), html: secVenue },
    { id: "travel", when: () => full() && (has(data.travel) || has(data.stay)), html: secTravel },
    { id: "dress", when: () => full() && events().some((e) => has(e.dress) || has(e.palette)), html: secDress },
    { id: "family", when: () => full() && (["blessings", "darshanabhilashi", "swagatotsuk", "kids"].some((k) => famList(k).length) || !!own("kidsLine")), html: secFamily },
    { id: "song", when: () => !!(data.song?.file || data.song?.url), html: secSong },
    { id: "voice", when: () => !!data.voice, html: secVoice },
    { id: "rsvp", when: () => full() && data.rsvp !== false && events().length > 0 && !afterWedding(), html: secRsvp },
    { id: "contacts", when: () => full() && (data.contacts || []).some((c) => c.phone), html: secContacts },
    { id: "shagun", when: () => full() && !!data.upi, html: secShagun },
    { id: "thanks", when: () => afterWedding(), html: secThanks },
  ];

  function sec(id, title, inner, lede = "") {
    return `<section class="sec" id="${id}">
      <h2 class="h reveal" lang="${lang}">${esc(title)}</h2>
      <div class="sec-orn">${divider()}</div>
      ${lede ? `<p class="lede reveal" lang="${lang}">${esc(lede)}</p>` : ""}
      ${inner}
    </section>`;
  }

  // The couple's own note to this family, in their words alone: the invite already greets them by name
  // (a couple asked to drop the "For the … family" above it, 3 November 2026).
  function secNote() {
    return `<section class="sec note" id="note">
      <p class="note-text reveal" lang="${lang}">${esc(pick(family.note))}</p>
    </section>`;
  }

  function secDate() {
    const u = t();
    const day = mainDate();
    // A save-the-date gives the day and the city: the time and the place come with the invitation.
    // The line names the day scratched: with no function that day, the wedding time the couple gave.
    const m = mainEvent();
    const w = full() ? (m && istDay(m.start) === istDay(day) ? m : { start: day, place: data.venue?.name }) : { ...(m || {}), start: day, place: data.city };
    // The day, the month and the year each under its own foil, or the whole date under one, as the
    // couple chooses in the editor (scratch: "one", Gautam, 4 November 2026).
    const one = data.scratch === "one";
    const arch = Boolean(theme.art?.scratch);
    const parts = one
      ? [[u.date, fmt(day, { day: "numeric", month: "long", year: "numeric" }), true]]
      : [[u.day, fmt(day, { day: "numeric" }), false], [u.month, fmt(day, { month: lang === "en" ? "short" : "long" }), lang !== "en"], [u.year, fmt(day, { year: "numeric" }), false]];
    // Nobody watching the video invite can scratch: there the line says what the film shows (the
    // collab bride Dipanwita, 3 November 2026).
    const frameSrc = arch ? esc(base + encodeURI(theme.art.scratch)) : "";
    return sec("date", u.dateT, `
      <p class="sparkle-line reveal" lang="${lang}"><b aria-hidden="true">✦</b>${esc(params.has("video") ? u.revealing : u.scratch)}<b aria-hidden="true">✦</b></p>
      <div class="cards${one ? " one" : ""}${arch ? " arch-foil" : ""}">
        ${parts.map(([unit, v, word], i) => `
          <div class="card">
            <button class="foil${arch ? " arch" : ""}${revealed.has(i) ? " done" : ""}" type="button" data-i="${i}" data-unit="${esc(unit)}" data-v="${esc(v)}"
              aria-label="${esc(revealed.has(i) ? u.revealed(unit, v) : u.scratchLabel(unit))}">
              <span class="val${word ? " word" : ""}" lang="${lang}" aria-hidden="true">${esc(v)}</span>
              <canvas aria-hidden="true"></canvas>
              ${frameSrc ? `<img class="foil-frame" src="${frameSrc}" alt="" draggable="false">` : ""}
            </button>
            ${one ? "" : `<span class="caps" lang="${lang}">${esc(unit)}</span>`}
          </div>`).join("")}
      </div>
      <div class="when-wrap${parts.every((_, i) => revealed.has(i)) ? "" : " hide"}" id="whenLine"><p class="when-line" lang="${lang}">
        ${esc(full() ? u.whenLine(fmt(w.start, { weekday: "long" }), clock(w === m ? weddingAt(m) : w.start)) : fmt(w.start, { weekday: "long" }))}<br>
        ${has(w.place) ? `<span class="soft">${esc(pick(w.place))}</span><br>` : ""}
        ${data.events?.includes(w) ? `<button class="textbtn" type="button" data-cal="${data.events.indexOf(w)}" lang="${lang}">${esc(u.addCal)}</button>` : ""}
      </p></div>`);
  }

  // A blessing of several lines, one under another: a Jain couple's four (Shankheshwar Parshwanath,
  // Nakoda Bheru, Ganesh, Sati Mata, 4 November 2026). In English letters it's set in small capitals'
  // spacing, so its longest line fits a phone.
  const omLines = (s) => String(s).split("\n").map((l) => l.trim()).filter(Boolean).map((l) => `<span>${esc(l)}</span>`).join("");
  const omClass = (s) => (/[a-z]/i.test(s) && !/[ऀ-ॿ]/.test(s) ? "om latin" : "om");

  function secInvitation() {
    const u = t();
    // The formal invitation names them in full when the couple gave their full names ("as on the
    // formal card"), and in Hindi falls back to the English, as everything else does.
    const nm = (p) => (lang === "mr" ? p.full?.mr || p.full?.hi || p.mr || p.hi || p.full?.en || p.en : p.full?.en || p.en);
    const pack = PACKS[data.community] || PACKS.none;
    // The couple's chosen line (in Hindi on the Hindi page, when we stored it so), else the design's
    // own (Ayodhya's जय सियाराम), else their tradition's.
    const invocation = data.invocation === false ? null : (lang === "hi" && data.invocationHi) || data.invocation || theme.invocation || pack.invocation;
    const parents = has(data.parents?.her) || has(data.parents?.him);
    // A design's blessing painting (Ayodhya's Ram Darbar, 2 November 2026) opens the invitation, as
    // the deity heads a printed card: still, whole, above every word, until the couple turns it off.
    const blessing = data.blessing === false ? null : art("blessing");
    const line = invocation ? `<p class="${omClass(invocation)}" dir="auto"${/[ঀ-৿]/.test(invocation) ? ' lang="bn"' : ""}>${omLines(invocation)}</p><div class="sec-orn small">${divider()}</div>` : "";
    const frame = art("archFrame");
    return `<section class="sec" id="invitation">
      <div class="arch-card reveal${frame ? " framed" : ""}" id="archCard">
        ${frame ? "" : `<svg class="arch-top" id="archTop" aria-hidden="true"></svg>
        <i class="pillar l" aria-hidden="true"></i><i class="pillar r" aria-hidden="true"></i>`}
        <div class="arch-in">
          ${blessing ? `<img class="inv-blessing" src="${blessing}" alt="" decoding="async">${line}${logoMark("inv-logo")}` : `${logoMark("inv-logo")}${line}`}
          <div class="inv">
            <p class="inv-lede" lang="${lang}">${esc(parents ? u.blessing : u.ownVoice)}</p>
            ${two(
              `<p class="name" lang="${lang}">${esc(nm(data.her))}</p>`,
              `<p class="name" lang="${lang}">${esc(nm(data.him))}</p>`,
            ).join(`
            <p class="with" lang="${lang}">${esc(u.with)}</p>
            `)}
            ${parents && u.close ? `<p class="caps" lang="${lang}" style="margin-top:12px">${esc(u.close)}</p>` : ""}
            ${mainDate() ? `<p class="inv-when" lang="${lang}">${esc(fmt(mainDate(), { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}</p>` : ""}
            ${full() && has(data.venue?.name) ? `<p class="inv-place" lang="${lang}">${esc(pick(data.venue.name))}${has(data.city) ? `, ${esc(pick(data.city))}` : ""}</p>` : ""}
            ${!full() && has(data.city) ? `<p class="inv-place" lang="${lang}">${esc(pick(data.city))}</p>` : ""}
            ${u.follow ? `<p class="caps inv-follow" lang="${lang}">${esc(u.follow)}</p>` : ""}
          </div>
        </div>
      </div>
    </section>`;
  }

  function secStory() {
    const u = t();
    return sec("story", u.storyT, `
      ${has(data.story) ? `${has(data.words?.dearAll) ? `<p class="dear reveal" lang="${lang}">${esc(u.dearAll)}</p>` : ""}<p class="story reveal" lang="${lang}">${esc(pick(data.story))}</p>` : ""}
      ${has(data.timeline) ? `<ol class="story-line">${data.timeline.map((m) => `<li class="reveal"><span class="sl-when" lang="${lang}">${esc(pick(m.when))}</span><span class="sl-what" lang="${lang}">${esc(pick(m.what))}</span></li>`).join("")}</ol>` : ""}`);
  }

  function secPhotos() {
    const u = t();
    const names = lang === "mr" ? two(esc(data.her.mr || data.her.hi), esc(data.him.mr || data.him.hi)).join(` <span class="so-amp">आणि</span> `) : two(esc(data.her.en), esc(data.him.en)).join(` <span class="so-amp">&amp;</span> `);
    return sec("photos", u.photosT, `
      <div class="photos" role="list" data-clarity-mask="true">
        ${data.photos.map((p) => `<figure class="ph" role="listitem">
          <div class="frame"><img src="${esc(media(p.src))}" alt="${esc(names)}${has(p.caption) ? `: ${esc(pick(p.caption))}` : ""}" loading="lazy" decoding="async"></div>
          ${has(p.caption) ? `<figcaption lang="${lang}">${esc(pick(p.caption))}</figcaption>` : ""}
        </figure>`).join("")}
      </div>
      ${data.photos.length > 1 ? `<p class="swipe" lang="${lang}">${esc(u.swipe)}</p>` : ""}`);
  }

  function secEvents() {
    const u = t();
    // Paintings are shared out over every function, so a family sees the same one on each card.
    // A close-family function carries no "Family only" tag: only the families marked close see it
    // anyway, and couples didn't want the tag on their guests' invites (Kriti & Partha, 3 November 2026).
    const arts = fnArt(data.events || []);
    return sec("celebrations", u.eventsT, `
      <div class="timeline">
        ${events().map((e) => {
          const slot = SLOT_FOR(e);
          const mood = theme.moods?.[slot]?.accent ? ink(theme.moods[slot].accent) : null;
          const file = arts.get(e);
          const img = file ? base + file : null;
          const i = data.events.indexOf(e);
          // A function at a venue of its own gives its place, its town and Directions here, and its full
          // address in the venue section below: given twice, it crowded the list (Surabhi, 5 November
          // 2026). Only a place left unnamed keeps its address here. walk.js's sheet does the same.
          return `<article class="tl"${mood ? ` style="--mood:${esc(mood)}"` : ""}>
            ${img ? `<img class="art reveal" src="${img}" alt="" loading="lazy" decoding="async">` : `<span class="art glyph reveal" aria-hidden="true">${ORN}</span>`}
            <div class="txt reveal">
              <span class="caps" lang="${lang}">${esc(fmt(e.start, { weekday: "short", day: "numeric", month: "short" }))}</span>
              <span class="time" lang="${lang}">${esc(clock(e.start))}</span>
              <span class="nm" lang="${lang}">${esc(pick(e.name))}${lang === "en" && (e.name.mr || e.name.hi) ? `<small lang="mr">${esc(e.name.mr || e.name.hi)}</small>` : ""}</span>
              ${has(e.place) ? `<span class="place" lang="${lang}">${esc(pick(e.place))}</span>` : ""}
              ${has(e.address) && !has(e.place) ? `<span class="addr" lang="${lang}">${esc(pick(e.address))}</span>` : ""}
              ${has(e.address) && has(e.place) && awayTown(e) ? `<span class="addr" lang="${lang}">${esc(awayTown(e))}</span>` : ""}
              ${townLine(e) ? `<span class="addr" lang="${lang}">${esc(townLine(e))}</span>` : ""}
              <button class="textbtn" type="button" data-cal="${i}" lang="${lang}">${esc(u.addCal)}</button>
              ${mapOf(e) ? `<a class="textbtn" href="${esc(mapOf(e))}" target="_blank" rel="noopener" lang="${lang}">${esc(u.directions)}</a>` : ""}
            </div>
          </article>`;
        }).join("")}
      </div>`);
  }

  function secCountdown() {
    return sec("countdown", t().countT, `
      <div class="count reveal${art("rosette") ? " roses" : ""}" id="count" role="timer" aria-live="off"></div>
      <p class="count-to reveal" id="countTo" lang="${lang}"></p>`);
  }

  function secVenue() {
    const u = t();
    // Functions at venues of their own follow the main venue, each under its name. The main venue is
    // then named for the functions held there, so a guest can tell which place is which. Functions at
    // the same place share one entry, named for all of them: three at home had made "At our residence"
    // three times (Tanush, 4 November 2026). A place is its name less a leading "at" or "from", and its
    // address, or its map link when it has none (venuesAway in lib/wedding.ts matches).
    const away = events().filter(ownVenue);
    const here = away.length ? andList(events().filter((e) => !ownVenue(e)).map((e) => pick(e.name))) : "";
    const norm = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const placeOf = (e) => [norm(e.place?.en || e.place?.hi).replace(/^(at|from|in) /, ""), norm(e.address?.en || e.address?.hi) || mapOf(e) || ""].join("|");
    const places = [];
    for (const e of away) { const p = places.find((x) => x.key === placeOf(e)); if (p) p.evs.push(e); else places.push({ key: placeOf(e), evs: [e] }); }
    const main = has(data.venue.name) || has(data.venue.address);
    const onCard = !data.venue.photo && art("venue");
    const place = `
      ${has(data.city) ? `<p class="city${onCard ? "" : " reveal"}" lang="${lang}">${esc(pick(data.city))}</p>` : ""}
      ${has(data.venue.name) ? `<p class="venue-name${onCard ? "" : " reveal"}" lang="${lang}">${esc(pick(data.venue.name))}</p>` : ""}
      ${has(data.venue.address) ? `<p class="venue-addr${onCard ? "" : " reveal"}" lang="${lang}">${esc(pick(data.venue.address))}</p>` : ""}`;
    return sec("venue", u.venueT, `
      ${here && main ? `<p class="caps venue-for reveal" lang="${lang}">${esc(here)}</p>` : ""}
      ${onCard ? "" : place}
      ${data.venue.photo ? `<img class="venue-art venue-photo reveal" src="${esc(media(data.venue.photo))}" alt="" loading="lazy" decoding="async" data-clarity-mask="true">`
        : onCard ? `<div class="venue-plate reveal"><img class="venue-art" src="${art("venue")}" alt="" loading="lazy" decoding="async"><div class="venue-on">${place}</div></div>` : ""}
      ${data.venue.map ? `<div class="map reveal${art("showMap") ? " map-card" : ""}" id="mapBox">${art("showMap") ? `<button class="map-load" type="button" aria-label="${esc(u.showMap)}"><img src="${esc(art("showMap"))}" alt="${esc(u.showMap)}"></button>` : `<button class="map-load" type="button" lang="${lang}">${esc(u.showMap)}</button>`}</div>
      ${art("mapsBadge") ? `<a class="maps-badge" href="${esc(data.venue.map)}" target="_blank" rel="noopener"><img src="${esc(art("mapsBadge"))}" alt="${esc(u.maps)}"></a>` : `<a class="btn" href="${esc(data.venue.map)}" target="_blank" rel="noopener" lang="${lang}">${esc(u.maps)}</a>`}` : ""}
      ${places.map(({ evs: [e, ...more] }) => { const map = [e, ...more].map(mapOf).find(Boolean); return `<div class="venue-also reveal">
        <p class="caps venue-for" lang="${lang}">${esc(andList([e, ...more].map((x) => pick(x.name))))}</p>
        ${has(e.place) ? `<p class="venue-name" lang="${lang}">${esc(pick(e.place))}</p>` : ""}
        ${has(e.address) ? `<p class="venue-addr" lang="${lang}">${esc(pick(e.address))}</p>` : ""}
        ${map ? `<a class="btn" href="${esc(map)}" target="_blank" rel="noopener" lang="${lang}">${esc(u.maps)}</a>` : ""}
      </div>`; }).join("")}`);
  }

  function secTravel() {
    const u = t();
    return sec("travel", u.travelT, `
      ${has(data.travel) ? `<ul class="travel" lang="${lang}">${data.travel.map((x) => `<li class="reveal">${esc(pick(x))}</li>`).join("")}</ul>` : ""}
      ${has(data.stay) ? `<h3 class="h3 reveal" lang="${lang}">${esc(u.stayT)}</h3><ul class="travel" lang="${lang}">${data.stay.map((s) => `<li class="reveal"><b>${esc(pick(s.name))}</b>${has(s.note) ? `<br>${esc(pick(s.note))}` : ""}</li>`).join("")}</ul>` : ""}`);
  }

  function secDress() {
    const u = t();
    return sec("dress", u.dressT, `
      ${art("dress") ? `<img class="dress-art reveal" src="${art("dress")}" alt="" loading="lazy" decoding="async">` : ""}
      <div class="dress-list">
        ${events().filter((e) => has(e.dress) || has(e.palette)).map((e) => `<div class="dress reveal">
          <span class="nm" lang="${lang}">${esc(pick(e.name))}${lang === "en" && (e.name.mr || e.name.hi) ? `<small lang="mr">${esc(e.name.mr || e.name.hi)}</small>` : ""}</span>
          ${has(e.palette) ? `<span class="dots" aria-hidden="true">${e.palette.map((c) => `<i style="background:${esc(c)}"></i>`).join("")}</span>` : "<span></span>"}
          ${has(e.dress) ? `<p lang="${lang}">${esc(pick(e.dress))}</p>` : ""}
        </div>`).join("")}
      </div>`, u.dressLede);
  }

  // A family list without its blank lines. A box typed in and then cleared keeps one empty line, and
  // it drew the heading with no names under it, the children's line as "say: you must come to the
  // wedding!" (Kishor & Jyotsna, 2 November 2026).
  function famList(k) {
    return (data.family?.[k] || []).filter((x) => String(pick(x)).trim());
  }

  function secFamily() {
    const u = t();
    const group = (k, title) => (famList(k).length ? `<div class="fam reveal"><p class="caps" lang="${lang}">${esc(title)}</p>${famList(k).map((x) => `<p class="fam-name" lang="${lang}">${esc(nb(pick(x)))}</p>`).join("")}</div>` : "");
    const kids = famList("kids");
    return sec("family", u.familyT, `
      <div class="fam-tree">
        ${group("blessings", u.blessT)}
        ${group("darshanabhilashi", u.darshan)}
        ${group("swagatotsuk", u.swagat)}
        ${kids.length || own("kidsLine") ? `<div class="fam reveal kids"><p class="caps" lang="${lang}">${esc(u.kids)}</p><p class="kids-line" lang="${lang}">${esc(u.kidsLine(kids.map(pick).join(", ")))}</p></div>` : ""}
      </div>`);
  }

  // The couple's song as a now-playing card: the record's cover (or a photo of the two of them),
  // the song and the singer, and a play button that loads Spotify's or YouTube's own player.
  function secSong() {
    const u = t();
    const s = data.song;
    const cover = s.cover || (data.photos?.[0] && media(data.photos[0].src)) || "";
    const title = pick(s.title) || u.songT;
    const art = `<div class="sc-cover" id="songCover"${s.cover ? "" : ` data-clarity-mask="true"`}>${cover ? `<img src="${esc(cover)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : `<span class="sc-disc" aria-hidden="true"></span>`}</div>
        <div class="sc-row">
          <div class="sc-meta"><p class="sc-title" lang="${lang}">${esc(title)}</p>${s.artist ? `<p class="sc-artist">${esc(s.artist)}</p>` : ""}</div>
          <svg class="sc-heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3 4.6 13a4.7 4.7 0 0 1 6.6-6.7l.8.8.8-.8a4.7 4.7 0 0 1 6.6 6.7Z" fill="currentColor"/></svg>
        </div>`;
    if (s.file) return sec("song", u.songT, `
      <div class="song-card reveal" id="songBox">
        ${art}
        <audio id="songAudio" preload="auto" src="${esc(s.file)}"></audio>
      </div>`);
    const from = /spotify\.com/.test(s.url) ? "Spotify" : /youtu/.test(s.url) ? "YouTube" : "";
    return sec("song", u.songT, `
      <div class="song-card reveal" id="songBox">
        ${art}
        <div class="sc-player" id="songPlayer">
          <div class="sc-bar" aria-hidden="true"><i></i></div>
          <div class="sc-controls">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6v12M18 6.5v11L9.5 12Z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
            <button class="sc-play" type="button" id="songLoad" aria-label="${esc(u.songPlay)}">${PLAY}</button>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 6v12M6 6.5v11l8.5-5.5Z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
          </div>
        </div>
      </div>
      ${from ? `<p class="sc-from reveal" lang="${lang}">${esc(u.songFrom(from))}</p>` : ""}`);
  }

  function secVoice() {
    const u = t();
    return sec("voice", u.voiceT, `<div class="reveal"><audio controls preload="none" src="${esc(media(data.voice))}"></audio></div>`);
  }

  function secRsvp() {
    const u = t();
    const kept = savedReply();
    return sec("rsvp", u.rsvpT, `
      <form class="rsvp" id="rsvpForm" lang="${lang}" novalidate>
        <div class="rsvp-done" id="rsvpDone" aria-live="polite"></div>
        <label class="field-label" for="rsvpFamily">${esc(u.familyLabel)}</label>
        <input class="field" id="rsvpFamily" name="family" autocomplete="name" placeholder="${esc(u.familyPh)}" value="${esc(kept?.family || greetName("en"))}" aria-describedby="rsvpNeed">
        <p class="rsvp-need" id="rsvpNeed" hidden>${esc(u.needFamily)}</p>
        <div class="rows">
          ${events().map((e) => { const i = data.events.indexOf(e); return `<div class="row">
            <span class="row-name"><b lang="${lang}">${esc(pick(e.name))}</b><span>${esc(fmt(e.start, { weekday: "short", day: "numeric", month: "short" }))}</span></span>
            <span class="stepper">
              <button class="step" type="button" data-step="-1" data-row="${i}" aria-label="${esc(u.fewer(pick(e.name)))}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
              <output id="cnt${i}" aria-live="polite">${kept?.counts?.[e.id] ?? 1}</output>
              <button class="step" type="button" data-step="1" data-row="${i}" aria-label="${esc(u.more(pick(e.name)))}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10M10 5v10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
            </span>
          </div>`; }).join("")}
        </div>
        <button class="btn" type="submit">${WA}<span>${esc(keeps ? u.send : u.waSend)}</span></button>
        <p class="rsvp-note" id="rsvpNote">${esc(keeps ? u.rsvpNote : u.waNote)}</p>
      </form>`, data.rsvpBy ? u.rsvpLede(fmt(data.rsvpBy, { day: "numeric", month: "long" })) : "");
  }

  function secContacts() {
    const u = t();
    return sec("contacts", u.contactsT, `<ul class="contacts">${data.contacts.filter((c) => c.phone).map((c) => `<li class="reveal"><span><b lang="${lang}">${esc(pick(c.name))}</b>${has(c.role) ? `<br><span class="soft" lang="${lang}">${esc(pick(c.role))}</span>` : ""}</span><a class="textbtn" href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}" lang="${lang}">${esc(u.call)}</a></li>`).join("")}</ul>`);
  }

  // The UPI ID itself, which copies on a tap: guests pay from their own UPI app.
  function secShagun() {
    const u = t();
    return sec("shagun", u.shagunT, `<button class="upi-id reveal" type="button" id="upiCopy" data-upi="${esc(data.upi)}" aria-label="${esc(u.upiCopy)}">
      <span class="upi-k" lang="${lang}">${esc(u.upiK)}</span><span class="upi-v">${esc(data.upi)}</span><span class="upi-hint" lang="${lang}">${esc(u.upiTap)}</span></button>`, u.shagunLede);
  }

  function secThanks() {
    const u = t();
    return sec("thanks", u.thanksT, "", u.thanksLede);
  }

  // The couple's logo (drawn by the site in their names; data.logoSrc, and data.logoDark for dark grounds).
  function logoMark(cls) {
    if (!data.logoSrc) return "";
    const dark = theme.palette?.paper && luminance(theme.palette.paper) < 0.3;
    // The Story map comes whole (its ring of pictures), and so does a logo made for the couple or
    // their own upload, so each gets room to be read. The arch too, for its elephants or peacocks
    // either side (4 November 2026).
    const whole = ["storymap", "custom", "upload", "arch"].includes(data.logo?.family) ? " whole" : "";
    return `<img class="${cls}${whole}" src="${esc(dark && data.logoDark ? data.logoDark : data.logoSrc)}" alt="" decoding="async" onerror="this.remove()">`;
  }

  function renderPaper() {
    const u = t();
    const names = lang === "mr" ? two(esc(data.her.mr || data.her.hi || data.her.en), esc(data.him.mr || data.him.hi || data.him.en)).join(` <span class="so-amp">आणि</span> `) : two(esc(data.her.en), esc(data.him.en)).join(` <span class="so-amp">&amp;</span> `);
    // A layout's own sections go in after the section they name (or first, with after: null).
    const all = [...SECTIONS];
    for (const s of LAY?.sections?.(api()) || []) {
      const i = s.after ? all.findIndex((x) => x.id === s.after) : -1;
      all.splice(i + 1, 0, s);
    }
    // An invite's own order (data.order), set for a couple who asks: the sections it names take the
    // places those sections had, in its order, and the rest stay put (Surabhi and Smarth wanted their
    // story and song together near the end, 4 November 2026). video-sections.ts pageOrder does the same.
    if (Array.isArray(data.order) && data.order.length) {
      const sorted = all.filter((s) => data.order.includes(s.id)).sort((a, b) => data.order.indexOf(a.id) - data.order.indexOf(b.id));
      let k = 0;
      all.forEach((s, i) => { if (data.order.includes(s.id)) all[i] = sorted[k++]; });
    }
    const due = all.filter((s) => { try { return s.when(); } catch { return false; } });
    // A site preview that shows only the first screen (?top, the home page's designs) draws just the
    // first two sections, so the photos and paintings further down aren't fetched for it.
    const shown = params.has("top") ? due.slice(0, 2) : due;
    $("#paper").innerHTML = shown.map((s) => s.html()).join("") + `
      <footer class="signoff">
        <div class="sec-orn">${divider()}</div>
        ${has(data.signoff) ? `<p class="so-text" lang="${lang}">${esc(nb(pick(data.signoff)))}</p>` : ""}
        ${logoMark("so-logo")}
        <p class="so-names" lang="${lang}">${names}</p>
      </footer>`;
    document.documentElement.style.setProperty("--arch", `url("${archMask()}")`);
    drawArch();
    fitWords();
    document.fonts?.ready.then(fitWords);
    $$(".foil").forEach(foil);
    $$("[data-cal]").forEach((b) => b.addEventListener("click", () => downloadIcs(data.events[+b.dataset.cal])));
    $$(".step").forEach((b) => b.addEventListener("click", () => {
      const o = $(`#cnt${b.dataset.row}`);
      o.value = o.textContent = String(Math.max(0, Math.min(30, (+o.textContent || 0) + +b.dataset.step)));
    }));
    $("#rsvpForm")?.addEventListener("submit", sendRsvp);
    // A family who has replied from this phone sees their reply, and can change it.
    const kept = $("#rsvpForm") && savedReply();
    if (kept) showDone(kept);
    const rows = $("#rsvpForm .rows");
    if (rows) new IntersectionObserver(([e]) => $("#controls").classList.toggle("away", e.isIntersecting), { rootMargin: "0px 0px -90px 0px" }).observe(rows);
    $(".map-load")?.addEventListener("click", loadMap);
    $("#songAudio") ? watchSong() : $("#songLoad")?.addEventListener("click", loadSong);
    $("#upiCopy")?.addEventListener("click", (ev) => copyUpi(ev.currentTarget, t()));
    LAY?.decorate?.($("#paper"), api());
    watchReveals();
    if ($("#count")) startCount();
  }

  // A long name in a script face is one word that can't wrap (Venkatalakshmi, Siddharthvardhan):
  // shrink it until it fits its line instead of letting it push the page sideways. The signoff's
  // names wrap between words, so only a single word longer than the line shrinks there.
  function fitWords() {
    for (const el of $$(".inv .name, .so-names")) {
      el.style.fontSize = "";
      el.style.whiteSpace = "";
      const room = el.parentElement.clientWidth;
      if (!room) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      for (let i = 0; i < 4 && el.scrollWidth > room + 1; i++) {
        el.style.fontSize = `${Math.max(size * 0.45, (parseFloat(el.style.fontSize) || size) * (room / el.scrollWidth) * 0.98)}px`;
      }
      // A full name too long for one line even at the smallest size goes onto two, at its spaces,
      // rather than past the edge of the page.
      if (el.scrollWidth > room + 1) el.style.whiteSpace = "normal";
    }
  }

  // The map is Google's and the song player is YouTube's or Spotify's: both load only on a tap.
  function loadMap() {
    let q = `${data.venue.name?.en || ""}, ${data.city?.en || ""}`;
    let z = 14;
    try {
      const url = new URL(data.venue.map);
      const query = url.searchParams.get("query");
      const at = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(\d+)z)?/);
      if (query) q = query;
      else if (at) { q = `${at[1]},${at[2]}`; if (at[3]) z = at[3]; }
    } catch {}
    $("#mapBox").classList.add("loaded");
    $("#mapBox").innerHTML = `<iframe title="${esc(t().mapTitle(pick(data.venue.name)))}" src="https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${z}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  }
  function watchSong() {
    const box = $("#songBox");
    const song = $("#songAudio");
    if (!box || !song) return;
    const bg = $("#music");
    let bgWasOn = false, shown = false;
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        shown = true;
        song.dataset.live = "1";
        const bgOn = !!(bg && !bg.paused);
        song.play().then(() => {
          if (song.dataset.live !== "1") { song.pause(); song.currentTime = 0; return; }
          bgWasOn = bgOn;
          if (bgOn) { bg.pause(); setSound(false); }
          box.classList.add("is-playing");
        }).catch(() => {});
        return;
      }
      const wasPlaying = shown && (!song.paused || song.dataset.live === "1");
      shown = false;
      song.dataset.live = "";
      song.pause();
      try { song.currentTime = 0; } catch {}
      box.classList.remove("is-playing");
      if (wasPlaying && bgWasOn) startMusic();
      bgWasOn = false;
    }, { threshold: 0.45 }).observe(box);
  }
  function loadSong() {
    const url = data.song.url;
    let src = null;
    const yt = url.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/);
    const sp = url.match(/open\.spotify\.com\/(track|album|playlist)\/(\w+)/);
    if (yt) src = `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1`;
    else if (sp) src = `https://open.spotify.com/embed/${sp[1]}/${sp[2]}?theme=0`;
    if (!src) return window.open(url, "_blank", "noopener");
    const a = $("#music");
    if (!a.paused) { fade(a, 0, 400); setSound(false); }
    // Spotify's compact player takes the place of the controls; a video takes the cover's.
    const frame = `<iframe class="song-frame${sp ? " spotify" : ""}" src="${src}" allow="autoplay; encrypted-media; clipboard-write" allowfullscreen title="${esc(t().songT)}"></iframe>`;
    if (sp) $("#songPlayer").innerHTML = frame;
    else { $("#songCover").classList.add("video"); $("#songCover").innerHTML = frame; $("#songPlayer").remove(); }
  }

  // ───────── Arches ─────────
  function archPoints(w, h, inset, top, lobes) {
    const half = (s) => {
      const x0 = inset, y0 = h, x3 = w / 2, y3 = top;
      const p = [[x0, y0], [x0, y0 - (h - top) * 0.72], [x3 - (w / 2 - inset) * 0.22, top + (h - top) * 0.4], [x3, y3]];
      const at = (u) => { const v = 1 - u; return [0, 1].map((k) => v * v * v * p[0][k] + 3 * v * v * u * p[1][k] + 3 * v * u * u * p[2][k] + u * u * u * p[3][k]); };
      const fine = Array.from({ length: 200 }, (_, i) => at(i / 199));
      const len = [0];
      for (let i = 1; i < fine.length; i++) len.push(len[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]));
      const total = len[len.length - 1];
      return Array.from({ length: lobes + 1 }, (_, j) => fine[len.findIndex((l) => l >= (total * j) / lobes)] || fine[fine.length - 1]).map(([x, y]) => [s ? w - x : x, y]);
    };
    return [half(false), half(true).reverse()];
  }
  function archD(w, h, inset, top, lobes, close) {
    const [left, right] = archPoints(w, h, inset, top, lobes);
    const pts = [...left, ...right.slice(1)];
    let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
      const c = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      d += `A${(c * 0.85).toFixed(2)} ${(c * 0.85).toFixed(2)} 0 0 1 ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
    }
    return d + (close || "");
  }
  function drawArch() {
    const card = $("#archCard"), svg = $("#archTop");
    if (!card || !svg) return;
    const w = card.clientWidth, h = Math.round(w * 0.88), c = w / 2;
    card.style.setProperty("--archH", `${h}px`);
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
    svg.innerHTML = `
      <path class="arch-line" d="${archD(w, h, 6, 18, 8)}"/>
      <path class="arch-gold" d="${archD(w, h, 13.5, 30, 8)}"/>
      <path class="arch-bud" d="M${c} 1c3.4 4.2 4 8 0 12.5-4-4.5-3.4-8.3 0-12.5Z"/>`;
  }
  function archMask() {
    const d = archD(100, 62, 0, 0, 4, "L100 140L0 140Z");
    return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" preserveAspectRatio="none"><path d="${d}"/></svg>`)}`;
  }

  // ───────── Gold foil to scratch ─────────
  // A theme may bring its own frame (kanjivaram's lotus arch). The frame stays; only the gold
  // inside its opening is foil, and scratching that reveals the date.
  let scratchImg = null;
  function scratchImage() {
    const file = theme.art?.scratch;
    if (!file) return null;
    if (!scratchImg) {
      scratchImg = new Image();
      scratchImg.src = base + encodeURI(file);
    }
    return scratchImg;
  }
  // The opening is the clear region you can reach from the middle without crossing the frame.
  function holeMask(img, W, H) {
    const key = `${W}x${H}`;
    if (img._maskKey === key) return img._mask;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, W, H);
    const px = g.getImageData(0, 0, W, H).data;
    const seen = new Uint8Array(W * H);
    const interior = new Uint8Array(W * H);
    const stack = [(W / 2) | 0, (H / 2) | 0];
    while (stack.length) {
      const y = stack.pop(), x = stack.pop();
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x;
      if (seen[i]) continue;
      seen[i] = 1;
      if (px[i * 4 + 3] > 48) continue;
      interior[i] = 1;
      stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
    img._mask = interior;
    img._maskKey = key;
    return interior;
  }
  function foil(btn) {
    const i = +btn.dataset.i;
    if (revealed.has(i)) return;
    const cvs = $("canvas", btn), ctx = cvs.getContext("2d", { willReadFrequently: true });
    const dpr = Math.min(2, devicePixelRatio || 1);
    let w = 0, h = 0;
    const img = scratchImage();
    const gold = getComputedStyle(document.documentElement).getPropertyValue("--gold").trim() || "#b08d4c";
    let mask = null;
    const paint = () => {
      w = btn.clientWidth; h = btn.clientHeight;
      if (!w) return;
      cvs.width = Math.round(w * dpr); cvs.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      const framed = img && img.complete && img.naturalWidth;
      if (framed) mask = holeMask(img, cvs.width, cvs.height);
      const g = ctx.createLinearGradient(0, 0, w, h);
      [[shade(gold, -0.35), 0], [shade(gold, 0.15), 0.22], [shade(gold, 0.55), 0.4], [shade(gold, -0.05), 0.58], [shade(gold, 0.4), 0.78], [shade(gold, -0.3), 1]].forEach(([c, o]) => g.addColorStop(o, c));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 2) { ctx.fillStyle = `rgba(255,248,225,${0.03 + Math.random() * 0.05})`; ctx.fillRect(0, y, w, 1); }
      for (let k = 0; k < (w * h) / 9; k++) { const a = Math.random(); ctx.fillStyle = a > 0.5 ? `rgba(255,250,230,${a * 0.5})` : `rgba(80,55,20,${a * 0.25})`; ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
      ctx.strokeStyle = "rgba(255,246,215,.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(5.5, 5.5, w - 11, h - 11, 8); ctx.stroke();
      ctx.fillStyle = "rgba(255,248,226,.75)"; ctx.font = `${Math.round(Math.min(w, h * 1.2) * 0.2)}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("✦", w / 2, h / 2);
      if (framed) {
        const id = ctx.getImageData(0, 0, cvs.width, cvs.height);
        const p = id.data;
        for (let i = 0; i < mask.length; i++) if (!mask[i]) p[i * 4 + 3] = 0;
        ctx.putImageData(id, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };
    paint();
    if (img && !(img.complete && img.naturalWidth)) img.addEventListener("load", () => { if (!revealed.has(i)) paint(); }, { once: true });
    new ResizeObserver(() => !revealed.has(i) && btn.clientWidth !== w && paint()).observe(btn);
    let down = false, last = null, moves = 0;
    const pt = (e) => { const r = cvs.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const scratch = (a, b) => { ctx.globalCompositeOperation = "destination-out"; ctx.lineCap = ctx.lineJoin = "round"; ctx.lineWidth = Math.max(22, w * 0.26); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x + 0.01, b.y); ctx.stroke(); };
    const cleared = () => {
      const px = ctx.getImageData(0, 0, cvs.width, cvs.height).data;
      let c = 0, n = 0;
      if (!mask) { for (let k = 3; k < px.length; k += 4 * 23) { n++; if (px[k] < 40) c++; } return n ? c / n : 0; }
      for (let i = 0; i < mask.length; i += 17) { if (!mask[i]) continue; n++; if (px[i * 4 + 3] < 40) c++; }
      return n ? c / n : 0;
    };
    const check = () => cleared() > 0.45 && done();
    btn.addEventListener("pointerdown", (e) => { if (revealed.has(i)) return; down = true; last = pt(e); try { btn.setPointerCapture(e.pointerId); } catch {} scratch(last, last); });
    btn.addEventListener("pointermove", (e) => { if (!down) return; const p = pt(e); scratch(last, p); last = p; if (++moves % 8 === 0) check(); });
    const up = () => { if (down) { down = false; check(); } };
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
    btn.addEventListener("click", (e) => e.detail === 0 && done());
    function done() {
      if (revealed.has(i)) return;
      revealed.add(i);
      btn.classList.add("done");
      btn.setAttribute("aria-label", t().revealed(btn.dataset.unit, btn.dataset.v));
      if ($$("#date .foil").every((b) => b.classList.contains("done"))) $("#whenLine")?.classList.remove("hide");
    }
  }
  function shade(hex, k) {
    const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
    return `rgb(${c.join(",")})`;
  }

  // ───────── Countdown ─────────
  function startCount() {
    clearInterval(countTimer);
    const el = $("#count"), f = countTarget(), target = new Date(f.start);
    $("#countTo").textContent = t().countTo(pick(f.name), fmt(f.start, { weekday: "long", day: "numeric", month: "long" }));
    const tick = () => {
      const ms = target - Date.now();
      if (ms <= 0) { el.innerHTML = ""; return clearInterval(countTimer); }
      const v = [Math.floor(ms / 864e5), Math.floor((ms % 864e5) / 36e5), Math.floor((ms % 36e5) / 6e4), Math.floor((ms % 6e4) / 1e3)];
      el.innerHTML = v.map((n, k) => `${k ? `<span class="colon" aria-hidden="true">:</span>` : ""}<div class="u"><b>${k ? String(n).padStart(2, "0") : n}</b><span lang="${lang}">${esc(t().units[k])}</span></div>`).join("");
    };
    tick();
    new IntersectionObserver(([e]) => { clearInterval(countTimer); if (e.isIntersecting) { tick(); countTimer = setInterval(tick, 1000); } }).observe(el);
  }

  function watchReveals() {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (!e.isIntersecting) return; e.target.classList.add("in"); io.unobserve(e.target); }), { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    $$(".reveal").forEach((el) => io.observe(el));
  }

  // ───────── RSVP and calendar ─────────
  // A family's reply (Gautam, 30 October 2026): they check it in a small dialog, then a live invite
  // with the RSVP manager (Royal, or bought with its template; the page sets SAATH.api only then)
  // keeps it with the couple (SAATH.api, /api/rsvp: their Replies tab counts it) and WhatsApp opens
  // with it written out, as before. The phone remembers the reply, so the family sees it when they
  // come back and can change it: sending again replaces it. Previews and the sample keep nothing.
  // Links go to api.whatsapp.com directly: the wa.me redirect turns emoji into "�".
  const keeps = Boolean(SAATH.api && SAATH.slug);
  const replyKey = `saath-rsvp:${SAATH.slug}:${SAATH.familyKey || familyParam.toLowerCase()}`;
  function savedReply() {
    if (!keeps) return null;
    try { const r = JSON.parse(localStorage.getItem(replyKey) || "null"); return r?.counts ? r : null; } catch { return null; }
  }
  const coupleName = () => (lang === "mr" ? two(data.her.mr || data.her.hi || data.her.en, data.him.mr || data.him.hi || data.him.en).join(" आणि ") : two(data.her.en, data.him.en).join(" & "));
  const replyList = (counts) => `<ul class="rc-list">${counts.map(([ev, n]) => `<li><span>${esc(pick(ev.name))}</span>${n > 0 ? `<b>${n}</b>` : `<b class="no">${esc(t().notComing)}</b>`}</li>`).join("")}</ul>`;

  function sendRsvp(e) {
    e.preventDefault();
    const input = $("#rsvpFamily");
    const fam = input.value.replace(/[|\n#]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
    // A reply nobody can put a name to can't be counted: the name comes first.
    $("#rsvpNeed").hidden = Boolean(fam);
    if (!fam) {
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }
    input.removeAttribute("aria-invalid");
    confirmRsvp(fam, events().map((ev) => [ev, +$(`#cnt${data.events.indexOf(ev)}`).textContent || 0]));
  }

  let dialog = null;
  function confirmRsvp(fam, counts) {
    const u = t();
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "rsvp-confirm";
      dialog.setAttribute("aria-labelledby", "rcTitle");
      // A tap outside the card closes it.
      dialog.addEventListener("click", (ev) => { if (ev.target === dialog) dialog.close(); });
      document.body.append(dialog);
    }
    dialog.lang = lang;
    dialog.innerHTML = `<div class="rc-in">
      <p class="rc-title" id="rcTitle">${esc(u.confirmT)}</p>
      <p class="rc-from">${esc(u.confirmFrom(fam))}</p>
      ${replyList(counts)}
      <p class="rc-note">${esc(keeps ? u.confirmNote(coupleName()) : u.waConfirmNote(coupleName()))}</p>
      <div class="rc-actions">
        <button class="btn" type="button" id="rcSend">${WA}<span>${esc(keeps ? u.confirmSend : u.waConfirmSend)}</span></button>
        <button class="rc-back" type="button" id="rcBack">${esc(u.confirmBack)}</button>
      </div>
    </div>`;
    $("#rcBack", dialog).addEventListener("click", () => dialog.close());
    $("#rcSend", dialog).addEventListener("click", () => { dialog.close(); deliver(fam, counts); });
    dialog.showModal();
  }

  function deliver(fam, counts) {
    const u = t();
    const reply = { guest: savedReply()?.guest || newId(), family: fam, counts: Object.fromEntries(counts.map(([ev, n]) => [ev.id, n])), at: new Date().toISOString() };
    if (keeps) {
      const note = $("#rsvpNote");
      fetch(`${SAATH.api}/api/rsvp`, { method: "POST", keepalive: true, body: JSON.stringify({ slug: SAATH.slug, guest: reply.guest, family: fam, familyKey: SAATH.familyKey || undefined, counts: reply.counts, lang }) })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          try { localStorage.setItem(replyKey, JSON.stringify(reply)); } catch {}
          showDone(reply);
        })
        .catch(() => { if (note) { note.textContent = u.saveFailed; note.classList.add("warn"); } });
    }
    // WhatsApp opens in the same tap, or the browser would block it.
    const lines = counts.map(([ev, n]) => `${pick(ev.name)}: ${n}`);
    const code = `#RSVP ${fam} | ${counts.map(([ev, n]) => `${ev.id} ${n}`).join(" | ")}`;
    const text = [u.waIntro(fam, coupleName()), ...lines, "", code].join("\n");
    const phone = (data.rsvpPhone || "").replace(/\D/g, "");
    window.open(`https://api.whatsapp.com/send?${phone ? `phone=${phone}&` : ""}text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);

  // The thank-you in the form's place, with the reply as it reached the couple.
  function showDone(reply) {
    const form = $("#rsvpForm");
    if (!form) return;
    const u = t();
    $("#rsvpDone").innerHTML = `<p class="rd-title">${esc(u.doneT)}</p>
      <p class="rd-line">${esc(u.doneLine(coupleName()))}</p>
      ${replyList(events().filter((ev) => ev.id in reply.counts).map((ev) => [ev, reply.counts[ev.id]]))}
      <button class="rd-change" type="button" id="rdChange">${esc(u.doneChange)}</button>`;
    form.classList.add("done");
    const note = $("#rsvpNote");
    note.textContent = u.rsvpNote;
    note.classList.remove("warn");
    $("#rdChange").addEventListener("click", () => {
      form.classList.remove("done");
      form.querySelector(".step")?.focus({ preventScroll: true });
    });
  }

  function downloadIcs(ev) {
    const stamp = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Saath Studio//Invite//EN", "BEGIN:VEVENT",
      `UID:${slug}-${ev.id}@saath.studio`, `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(ev.start)}`, `DTEND:${stamp(ev.end || ev.start)}`,
      `SUMMARY:${two(data.her.en, data.him.en).join(" & ")}: ${ev.name.en}`,
      `LOCATION:${(ownVenue(ev) ? [ev.place?.en, ev.address?.en] : [ev.place?.en, data.venue?.name?.en, data.city?.en]).filter(Boolean).join(", ")}`,
      ev.dress?.en ? `DESCRIPTION:${ev.dress.en}` : null, "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = `${slug}-${ev.id}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /** Copies the UPI ID, and says so for a moment where the hint was. */
  function copyUpi(btn, u) {
    const hint = btn.querySelector(".upi-hint");
    const done = () => { hint.textContent = u.upiCopied; btn.classList.add("copied"); setTimeout(() => { hint.textContent = u.upiTap; btn.classList.remove("copied"); }, 1800); };
    (navigator.clipboard?.writeText(btn.dataset.upi) || Promise.reject()).then(done).catch(() => {
      // Older browsers: select the ID so a long press copies it.
      const r = document.createRange(); r.selectNodeContents(btn.querySelector(".upi-v"));
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    });
  }

  // ───────── Music ─────────
  function startMusic() {
    if (data.music === "off") return;
    const a = $("#music");
    a.volume = 0;
    a.play().then(() => { setSound(true); fade(a, 0.7, 2400); }).catch(() => setSound(false));
  }
  function fade(a, to, ms) {
    const from = a.volume, t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / ms); a.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k < 1) requestAnimationFrame(step); else if (to === 0) a.pause(); };
    requestAnimationFrame(step);
  }
  function setSound(on) {
    const b = $("#soundBtn");
    b.setAttribute("aria-pressed", String(on));
    b.setAttribute("aria-label", on ? "Pause music" : "Play music");
  }
  function toggleSound() {
    const a = $("#music");
    if (a.paused) { a.play().then(() => fade(a, 0.7, 800)).catch(() => {}); setSound(true); }
    else { fade(a, 0, 500); setSound(false); }
  }
  document.addEventListener("visibilitychange", () => {
    const a = $("#music");
    if (document.hidden && !a.paused) { a.pause(); a.dataset.resume = "1"; }
    else if (!document.hidden && a.dataset.resume) { delete a.dataset.resume; a.play().catch(() => {}); }
  });

  function setLang(next) {
    lang = next;
    document.documentElement.lang = lang;
    renderGate();
    renderHero();
    renderToday();
    const y = scrollY;
    renderPaper();
    $$(".reveal").forEach((el) => el.classList.add("in"));
    scrollTo(0, y);
  }

  boot().catch((err) => {
    console.error(err);
    document.body.classList.remove("sealed");
  });
})();
