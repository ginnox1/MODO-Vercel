import { FormEvent, useEffect, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, LockKeyhole, Move3D, Phone, Sparkles } from "lucide-react";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

function trackEvent(name: string, data?: Record<string, unknown>) {
  const analytics = (window as Window & { umami?: { track?: (event: string, data?: Record<string, unknown>) => void } }).umami;
  analytics?.track?.(name, data);
}

function getAnalyticsContext() {
  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer || undefined;
  const source = params.get("utm_source") || (referrer ? new URL(referrer).hostname.replace(/^www\./, "") : "direct");
  const agent = navigator.userAgent;
  const browser = agent.includes("Edg") ? "Edge" : agent.includes("Chrome") ? "Chrome" : agent.includes("Firefox") ? "Firefox" : agent.includes("Safari") ? "Safari" : "Other";
  const location = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  return { source, browser, location, path: window.location.pathname, referrer };
}

const HERO_MODES = ["work", "study", "living", "sleep"] as const;
const HERO_MODES_AM = ["ሥራ", "ጥናት", "ኑሮ", "እንቅልፍ"] as const;
const TELEGRAM_WELCOME_MESSAGE = "Welcome to MODO. You’re in the founding circle — early looks, founding prices, and a say in what we make.";
const LANGUAGE_STORAGE_KEY = "modo-language";
type Language = "en" | "am";

const copy = {
  en: {
    idea: "The idea", founding: "Founding members", login: "Member login", designed: "Designed in Addis Ababa", intro: "Furniture that shifts with your day, your room, and the way you actually live.", join: "Join the founding circle", note: "For smaller rooms. For bigger ideas.", folds: "folds away", stays: "stays beautiful", caption: <>An armchair, a daybed,<br />a little more possibility.</>, ideaKicker: "The MODO idea", ideaTitle: <>One room.<br /><span>Many versions</span><br />of you.</>, ideaLead: "In Addis, every square metre has a job. MODO makes furniture that understands the assignment.", ideaBody: "We design considered pieces that open, tuck, stack, and transform — so your home can move from morning coffee to guests, work, rest, and back again.", detailOne: "Thoughtful proportions for real rooms", detailTwo: "Locally minded materials and making", glimpse: "A first glimpse", previewTitle: <>Three ways<br /><span>MODO makes room.</span></>, previewIntro: "Small pieces of a collection designed to move with you.", fold: "Fold", foldText: "Furniture that disappears when you need space.", shift: "Shift", shiftText: "Pieces that move from work to rest.", stay: "Stay", stayText: "Simple forms designed for everyday living.", collection: "First collection coming soon.", circle: "Join the founding circle", firstCircle: "A small first circle", foundingTitle: <>Be part of<br /><em>what fits next.</em></>, foundingBody: "We’re inviting a small group of founding members to shape the first MODO collection. Get early access, founding prices, and a say in what we make.", invitation: "Founding member invitation", homeTitle: <>Make MODO part<br />of your home.</>, fullName: "Full name", phone: "Phone number", submit: "Join the founding circle", saving: "Saving your spot…", telegram: "Send launch updates on Telegram", optionalHandle: "Optional Telegram username", privacy: "No spam. Just good furniture news.", successLabel: "You’re on the list.", successTitle: <>Welcome to the<br />founding circle.</>, successBody: "We’ll be in touch soon with the first look at MODO.", addAnother: "Add another person", footer: "Furniture that makes space for life.", privateArea: "Private member area", validation: "Please add your full name and phone number.", error: "Something went wrong. Please try again."
  },
  am: {
    idea: "ሀሳቡ", founding: "የመጀመሪያ አባላት", login: "የአባል መግቢያ", designed: "በአዲስ አበባ የተነደፈ", intro: "ከዕለት ተዕለት ሕይወትዎ፣ ከክፍልዎ እና ከአኗኗርዎ ጋር የሚለዋወጥ የቤት ዕቃ።", join: "የመጀመሪያ አባላትን ይቀላቀሉ", note: "ለትንንሽ ክፍሎች። ለትልቅ ሀሳቦች።", folds: "ይታጠፋል", stays: "ውበቱን ይጠብቃል", caption: <>የእጅ ወንበር፣ የቀን አልጋ፣<br />እና ትንሽ ተጨማሪ እድል።</>, ideaKicker: "የMODO ሀሳብ", ideaTitle: <>አንድ ክፍል።<br /><span>ብዙ የእርስዎ</span><br />ገጽታዎች።</>, ideaLead: "በአዲስ አበባ እያንዳንዱ ካሬ ሜትር የራሱ ሚና አለው። MODO ይህን የሚረዳ የቤት ዕቃ ይነድፋል።", ideaBody: "እንዲከፈቱ፣ እንዲደበቁ፣ እንዲደረደሩ እና እንዲለወጡ የተነደፉ ዕቃዎችን እንሰራለን—ቤትዎ ከጠዋት ቡና ወደ እንግዳ፣ ሥራ፣ እረፍት እና እንደገና ወደ ሌላ ቅርጽ እንዲሸጋገር።", detailOne: "ለእውነተኛ ክፍሎች የተመጠነ ቅርጽ", detailTwo: "አካባቢያዊ ቁሳቁስና አሰራር", glimpse: "የመጀመሪያ ጨረፍታ", previewTitle: <>MODO ቦታን<br /><span>የሚያዘጋጅባቸው ሦስት መንገዶች።</span></>, previewIntro: "ከእርስዎ ጋር እንዲለዋወጥ የተነደፈ ስብስብ ትንሽ ጨረፍታ።", fold: "መታጠፍ", foldText: "ቦታ ሲፈልጉ የሚጠፋ የቤት ዕቃ።", shift: "መቀየር", shiftText: "ከሥራ ወደ እረፍት የሚሸጋገሩ ዕቃዎች።", stay: "መቆየት", stayText: "ለዕለታዊ ኑሮ የተነደፉ ቀላል ቅርጾች።", collection: "የመጀመሪያው ስብስብ በቅርቡ።", circle: "የመጀመሪያ አባላትን ይቀላቀሉ", firstCircle: "ትንሽ የመጀመሪያ ቡድን", foundingTitle: <>ቀጣዩ የሚስማማው<br /><em>ነገር አካል ይሁኑ።</em></>, foundingBody: "የመጀመሪያውን MODO ስብስብ እንዲቀርጹ ትንሽ የመጀመሪያ አባላት ቡድን እየጋበዝን ነው። ቀድመው ይድረሱ፣ በመጀመሪያ ዋጋ ይግዙ፣ በምንሰራውም ላይ ድምጽዎን ያሰሙ።", invitation: "የመጀመሪያ አባል ግብዣ", homeTitle: <>MODOን<br />የቤትዎ አካል ያድርጉ።</>, fullName: "ሙሉ ስም", phone: "ስልክ ቁጥር", submit: "የመጀመሪያ አባላትን ይቀላቀሉ", saving: "ቦታዎ እየተያዘ ነው…", telegram: "የMODO የመጀመሪያ ዜናዎችን በTelegram ይቀበሉ", optionalHandle: "የTelegram ስም (አማራጭ)", privacy: "አይረብሽም። ጥሩ የቤት ዕቃ ዜና ብቻ።", successLabel: "በዝርዝሩ ውስጥ ነዎት።", successTitle: <>ወደ የመጀመሪያ<br />አባላት እንኳን ደህና መጡ።</>, successBody: "የመጀመሪያውን MODO ጨረፍታ በቅርቡ እናጋራዎታለን።", addAnother: "ሌላ ሰው ይጨምሩ", footer: "ለሕይወት ቦታ የሚያዘጋጅ የቤት ዕቃ።", privateArea: "የአባላት የግል ክፍል", validation: "እባክዎ ሙሉ ስምዎንና ስልክ ቁጥርዎን ያስገቡ።", error: "ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።"
  }
} as const;

export default function Home() {
  const [language, setLanguage] = useState<Language>(() => (typeof window !== "undefined" && window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === "am" ? "am" : "en"));
  const content = copy[language];
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [telegramOptIn, setTelegramOptIn] = useState(false);
  const [telegramHandle, setTelegramHandle] = useState("");
  const [telegramStartUrl, setTelegramStartUrl] = useState<string | null>(null);
  const [heroMode, setHeroMode] = useState(0);
  const [previousHeroMode, setPreviousHeroMode] = useState(0);
  const recordAnalytics = trpc.analytics.record.useMutation();
  const joinWaitlist = trpc.waitlist.join.useMutation({
    onSuccess: (result) => {
      setSubmitted(true);
      setFormError("");
      setTelegramStartUrl(result.telegramStartUrl);
      trackEvent("founding-member-joined");
    },
    onError: (error) => setFormError(error.message || content.error),
  });

  useEffect(() => {
    document.documentElement.lang = language === "am" ? "am" : "en";
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    trackEvent("landing-page-view");
    recordAnalytics.mutate({ eventName: "page-view", ...getAnalyticsContext() });
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      setHeroMode((current) => {
        setPreviousHeroMode(current);
        return (current + 1) % HERO_MODES.length;
      });
    }, 3200);
    return () => window.clearInterval(interval);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    if (!fullName.trim() || !phone.trim()) {
      setFormError(content.validation);
      return;
    }
    joinWaitlist.mutate({ fullName, phone, telegramOptIn, telegramHandle, notificationPreference: telegramOptIn ? "telegram" : "phone" });
  };

  return (
    <main className={`modo-site ${language === "am" ? "amharic-mode" : ""}`}>
      <nav className="modo-nav" aria-label="Primary navigation">
        <a className="modo-logo" href="#top" aria-label="MODO home">
          <span className="modo-logo-mark">M</span>
          <span>MODO</span>
        </a>
        <div className="modo-nav-links">
          <a href="#idea">{content.idea}</a>
          <a href="#founding">{content.founding}</a>
        </div>
        <button className="language-toggle" type="button" onClick={() => setLanguage(language === "en" ? "am" : "en")} aria-label={language === "en" ? "በአማርኛ ይመልከቱ" : "View in English"}><span className={language === "en" ? "active" : ""}>EN</span><span>/</span><span className={language === "am" ? "active" : ""}>አማ</span></button>
        <button className="nav-login" type="button" onClick={() => { trackEvent("login-click"); startLogin(); }}>
          {content.login} <ArrowUpRight size={15} strokeWidth={2.3} />
        </button>
      </nav>

      <section className="modo-hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> {content.designed}</p>
          <h1>{language === "am" ? <>ቦታ<br /><em>ለ<span className="hero-word-rotator" aria-live="polite"><span key={`previous-${previousHeroMode}`} className="hero-word-layer hero-word-previous" aria-hidden="true">{HERO_MODES_AM[previousHeroMode]}።</span><span key={`current-${heroMode}`} className="hero-word-layer hero-word-current">{HERO_MODES_AM[heroMode]}።</span></span></em></> : <>Make room<br /><em>for <span className="hero-word-rotator" aria-live="polite"><span key={`previous-${previousHeroMode}`} className="hero-word-layer hero-word-previous" aria-hidden="true">{HERO_MODES[previousHeroMode]}.</span><span key={`current-${heroMode}`} className="hero-word-layer hero-word-current">{HERO_MODES[heroMode]}.</span></span></em></>}</h1>
          <p className="hero-intro">{content.intro}</p>
          <a className="hero-cta" href="#founding" onClick={() => trackEvent("hero-cta-click")}>
            {content.join} <ArrowUpRight size={18} />
          </a>
          <div className="hero-note"><span>01</span><span>{content.note}</span></div>
        </div>
        <div className="hero-visual" aria-label="Abstract illustration of adaptable furniture" role="img">
          <div className="sun-disc" />
          <div className="room-line room-line-one" />
          <div className="room-line room-line-two" />
          <div className="chair-form chair-back" />
          <div className="chair-form chair-seat" />
          <div className="chair-form chair-leg chair-leg-one" />
          <div className="chair-form chair-leg chair-leg-two" />
          <div className="floating-label label-fold"><Move3D size={14} /> {content.folds}</div>
          <div className="floating-label label-soft"><Sparkles size={14} /> {content.stays}</div>
          <div className="hero-caption">{content.caption}</div>
        </div>
      </section>

      <section className="idea-section" id="idea">
        <div className="section-kicker">{content.ideaKicker} <span>02</span></div>
        <div className="idea-grid">
          <div>
            <h2>{content.ideaTitle}</h2>
          </div>
          <div className="idea-body">
            <p className="lead">{content.ideaLead}</p>
            <p>{content.ideaBody}</p>
            <div className="idea-detail-row">
              <div><strong>01</strong><span>{content.detailOne}</span></div>
              <div><strong>02</strong><span>{content.detailTwo}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="preview-section" aria-labelledby="preview-title">
        <div className="section-kicker">{content.glimpse} <span>03</span></div>
        <div className="preview-heading"><h2 id="preview-title">{content.previewTitle}</h2><p>{content.previewIntro}</p></div>
        <div className="preview-grid">
          <article className="preview-card preview-fold"><div className="preview-shape"><span /></div><div className="preview-card-copy"><span className="preview-number">01</span><h3>{content.fold}</h3><p>{content.foldText}</p></div></article>
          <article className="preview-card preview-shift"><div className="preview-shape"><span /><span /></div><div className="preview-card-copy"><span className="preview-number">02</span><h3>{content.shift}</h3><p>{content.shiftText}</p></div></article>
          <article className="preview-card preview-stay"><div className="preview-shape"><span /></div><div className="preview-card-copy"><span className="preview-number">03</span><h3>{content.stay}</h3><p>{content.stayText}</p></div></article>
        </div>
        <p className="preview-footnote">{content.collection} <a href="#founding">{content.circle} <ArrowUpRight size={14} /></a></p>
      </section>

      <section className="founding-section" id="founding">
        <div className="founding-stamp">ADDIS<br />ABABA<br /><span>2026</span></div>
        <div className="founding-copy">
          <p className="eyebrow eyebrow-light"><span className="eyebrow-dot" /> {content.firstCircle}</p>
          <h2>{content.foundingTitle}</h2>
          <p>{content.foundingBody}</p>
        </div>
        <div className="waitlist-card">
          {submitted ? (
            <div className="success-state">
              <div className="success-icon"><Check size={22} /></div>
              <p className="form-label">{content.successLabel}</p>
              <h3>{content.successTitle}</h3>
              <p>{content.successBody}{telegramOptIn ? (language === "am" ? " Telegram ዝማኔዎችን ለመቀበል MODOን ይጀምሩ።" : " To receive Telegram updates, start a chat with MODO when the bot opens.") : ""}</p>
              {telegramOptIn && <p className="telegram-welcome"><strong>{language === "am" ? "የTelegram እንኳን ደህና መጡ መልዕክት" : "Telegram welcome"}</strong> “{language === "am" ? "እንኳን ወደ MODO መጡ። የመጀመሪያ አባላት ቡድን ውስጥ ነዎት—የመጀመሪያ ጨረፍታዎችን፣ የመጀመሪያ ዋጋዎችን እና በምንሰራው ላይ ድምጽዎን ያገኛሉ።" : TELEGRAM_WELCOME_MESSAGE}”</p>}
              {telegramOptIn && <a className="telegram-start-button" href={telegramStartUrl ?? "https://t.me/ModoFurnitureBot"} target="_blank" rel="noreferrer"><span>{language === "am" ? "MODOን በTelegram ይክፈቱ" : "Open MODO on Telegram"}</span><ArrowUpRight size={16} /></a>}
              <button type="button" className="text-link" onClick={() => { setSubmitted(false); setFullName(""); setPhone(""); setTelegramStartUrl(null); }}>{content.addAnother} <ArrowUpRight size={15} /></button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-topline"><span>{content.invitation}</span><LockKeyhole size={15} /></div>
              <h3>{content.homeTitle}</h3>
              <label htmlFor="fullName">{content.fullName}</label>
              <input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder={language === "am" ? "ለምሳሌ ሀና ተስፋዬ" : "e.g. Hana Tesfaye"} autoComplete="name" />
              <label htmlFor="phone">{content.phone}</label>
              <div className="phone-field"><span>+251</span><input id="phone" value={phone} onChange={(event) => setPhone(event.target.value.replace(/[^0-9 ]/g, ""))} placeholder="9X XXX XXXX" inputMode="tel" autoComplete="tel" /></div>
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <button className="submit-button" type="submit" disabled={joinWaitlist.isPending}>
                {joinWaitlist.isPending ? content.saving : content.submit} <ArrowUpRight size={18} />
              </button>
              <label className="telegram-check"><input type="checkbox" checked={telegramOptIn} onChange={(event) => setTelegramOptIn(event.target.checked)} /><span className="custom-check">{telegramOptIn && <Check size={12} />}</span><span>{content.telegram}</span></label>
              {telegramOptIn && <input className="telegram-handle" value={telegramHandle} onChange={(event) => setTelegramHandle(event.target.value)} placeholder={content.optionalHandle} autoComplete="off" />}
              <p className="privacy-note"><Phone size={13} /> {content.privacy}</p>
            </form>
          )}
        </div>
      </section>

      <footer className="modo-footer">
        <span>© 2026 MODO</span>
        <span>{content.footer}</span>
        <button type="button" onClick={() => { trackEvent("footer-login-click"); startLogin(); }}><LockKeyhole size={13} /> {content.privateArea}</button>
      </footer>
    </main>
  );
}
