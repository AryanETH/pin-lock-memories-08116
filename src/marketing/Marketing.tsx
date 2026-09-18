import {
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Fingerprint,
  Image as ImageIcon,
  LockKeyhole,
  MapPin,
  Menu,
  MousePointer2,
  Plus,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import MapPortalScene from './MapPortalScene';
import { articles, product, screenshots } from './product';
import { usePageSeo } from './seo';
import './marketing.css';

export function Download({ compact = false, placement = 'body' }: { compact?: boolean; placement?: string }) {
  return (
    <a
      className={`ml-download ${compact ? 'compact' : ''}`}
      href={product.playUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-placement={placement}
    >
      <span>{compact ? 'Get Mapplock' : 'Get it on Google Play'}</span>
      <ArrowUpRight aria-hidden="true" size={18} />
    </a>
  );
}

function Logo() {
  return (
    <a href="/" className="ml-logo" aria-label="Mapplock home">
      <span className="ml-logo-mark" aria-hidden="true">
        <MapPin size={28} strokeWidth={2.35} />
        <LockKeyhole className="ml-logo-lock" size={10} strokeWidth={2.4} />
      </span>
      <span>mapplock<span className="ml-logo-period">.</span></span>
    </a>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <header className={`ml-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="ml-shell ml-nav">
        <Logo />
        <nav className={open ? 'is-open' : ''} aria-label="Main navigation">
          <a href="/#features" onClick={() => setOpen(false)}>Features</a>
          <a href="/#how-it-works" onClick={() => setOpen(false)}>How it works</a>
          <a href="/blog" onClick={() => setOpen(false)}>Blog</a>
          <a href="/#privacy" onClick={() => setOpen(false)}>Privacy</a>
        </nav>
        <div className="ml-nav-actions">
          <Download compact placement="navigation" />
          <button
            className="ml-menu"
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const [pressed, setPressed] = useState(false);
  const release = () => setPressed(false);
  const pressKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setPressed(true);
    }
  };

  return (
    <section className="ml-hero ml-shell">
      <div
        className={`ml-hero-stage ${pressed ? 'is-revealed' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Press and hold to reveal the Mapplock portal"
        onPointerDown={() => setPressed(true)}
        onPointerUp={release}
        onPointerCancel={release}
        onPointerLeave={release}
        onKeyDown={pressKey}
        onKeyUp={release}
      >
        <img className="ml-hero-environment" src="/visuals/mapplock-orbit-bg.png" alt="" />
        <div className="ml-webgl" aria-hidden="true"><MapPortalScene active={pressed} /></div>
        <div className="ml-hero-vignette" aria-hidden="true" />
        <div className="ml-hero-copy">
          <p className="ml-kicker">Android privacy · Reimagined</p>
          <h1>A map on<br />the outside.<br /><span>Your private<br />world within.</span></h1>
          <p className="ml-hero-description">Lock selected apps and keep personal photos behind a place only you know.</p>
          <div className="ml-hero-actions">
            <Download placement="hero" />
            <a className="ml-text-link" href="#how-it-works">See how it works <ArrowRight size={17} /></a>
          </div>
          <p className="ml-platform-note"><Smartphone size={14} /> Android · Made in Bhopal, India</p>
        </div>
        <div className="ml-interaction-cue" aria-hidden="true">
          <span className="ml-cue-icon"><MousePointer2 size={20} /></span>
          <span>{pressed ? 'Portal revealed' : 'Press & hold'}<small>{pressed ? 'Release to close' : 'to reveal'}</small></span>
        </div>
        <div className="ml-coordinates" aria-hidden="true">23.2599° N<br />77.4126° E</div>
      </div>
      <div className="ml-hero-index" aria-hidden="true">
        <span>01</span><span>Same world.<br />A more private you.</span><span>Scroll to explore <ArrowDown size={16} /></span>
      </div>
    </section>
  );
}

const steps = [
  { number: '01', icon: MapPin, title: 'Choose a secret place.', text: 'Pick a memorable coordinate on the map. You navigate there on screen—no travel required.' },
  { number: '02', icon: Fingerprint, title: 'Return and authenticate.', text: 'Double-tap inside the saved area, then use your PIN, pattern or supported fingerprint.' },
  { number: '03', icon: LockKeyhole, title: 'Enter your private world.', text: 'Open protected apps and the local photo vault from one discreet dashboard.' },
];

function HowItWorks() {
  const [active, setActive] = useState(0);
  return (
    <section id="how-it-works" className="ml-story ml-shell">
      <div className="ml-story-heading">
        <p className="ml-kicker ml-blue">01 · Secret entry</p>
        <h2>A lock disguised<br />as a map.</h2>
        <p>Mapplock turns a familiar map into the entrance to your protected space. The place is only the beginning—you still authenticate before anything opens.</p>
      </div>
      <div className="ml-story-grid">
        <div className={`ml-story-visual step-${active}`}>
          <div className="ml-story-radar" aria-hidden="true"><MapPin size={46} /><span /></div>
          <p>{steps[active].number} / 03</p>
          <h3>{steps[active].title}</h3>
          <span>{steps[active].text}</span>
        </div>
        <div className="ml-step-list">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <button key={step.number} type="button" className={index === active ? 'is-active' : ''} onClick={() => setActive(index)}>
                <span>{step.number}</span><Icon size={20} /><strong>{step.title}</strong><ArrowRight size={18} />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeatureShowcase() {
  return (
    <section id="features" className="ml-features">
      <div className="ml-shell">
        <div className="ml-section-intro">
          <p className="ml-kicker">02 · Inside the map</p>
          <h2>Two kinds of privacy.<br /><span>One hidden entrance.</span></h2>
        </div>
        <div className="ml-feature-row">
          <div className="ml-feature-copy">
            <span className="ml-feature-number">01</span>
            <LockKeyhole size={28} />
            <h3>App Lock</h3>
            <p>Add an authentication step before selected Android apps open. Protect the conversations, accounts and tools that matter to you.</p>
            <a href="/app-lock-for-android">Explore App Lock <ArrowUpRight size={16} /></a>
          </div>
          <figure className="ml-device-shot ml-device-blue"><img src="/screenshots/app-lock.png" alt="Mapplock app selection screen" loading="lazy" /></figure>
        </div>
        <div className="ml-feature-row is-reversed">
          <div className="ml-feature-copy">
            <span className="ml-feature-number">02</span>
            <ImageIcon size={28} />
            <h3>Photo Vault</h3>
            <p>Bring selected photos into a private, on-device space. Your map entrance and authentication keep casual browsing out.</p>
            <a href="/photo-vault">Explore Photo Vault <ArrowUpRight size={16} /></a>
          </div>
          <figure className="ml-device-shot ml-device-green"><img src="/screenshots/photo-vault.png" alt="Private photos stored inside Mapplock" loading="lazy" /></figure>
        </div>
      </div>
    </section>
  );
}

function Privacy() {
  const points = [
    { icon: Smartphone, label: 'On your device', text: 'Private file contents stay local according to the current Mapplock privacy policy.' },
    { icon: Fingerprint, label: 'Your authentication', text: 'Use a PIN, pattern or supported fingerprint after finding your secret place.' },
    { icon: ShieldCheck, label: 'Your control', text: 'Choose which apps and photos need an extra layer. Keep your Android screen lock on too.' },
  ];
  return (
    <section id="privacy" className="ml-privacy">
      <div className="ml-shell">
        <p className="ml-kicker">03 · Privacy, clearly</p>
        <div className="ml-privacy-title"><h2>Your files.<br />Your phone.<br /><span>Your rules.</span></h2><p>A private vault should not feel mysterious. Mapplock keeps its core promise simple and gives you control over what you protect.</p></div>
        <div className="ml-privacy-points">{points.map(({ icon: Icon, label, text }) => <div key={label}><Icon size={25} /><span><strong>{label}</strong><p>{text}</p></span></div>)}</div>
        <a className="ml-text-link" href="/privacy">Read the privacy details <ArrowRight size={17} /></a>
      </div>
    </section>
  );
}

function Screens() {
  return (
    <section className="ml-screens ml-shell" aria-labelledby="screens-title">
      <div className="ml-section-intro">
        <p className="ml-kicker ml-blue">04 · The experience</p>
        <h2 id="screens-title">Familiar outside.<br /><span>Private inside.</span></h2>
      </div>
      <div className="ml-screen-track">
        {screenshots.slice(0, 4).map((shot, index) => (
          <figure key={shot.file} style={{ '--shot-index': index } as CSSProperties}>
            <img src={`/screenshots/${shot.file}.png`} alt={shot.alt} loading="lazy" />
            <figcaption><span>0{index + 1}</span><strong>{shot.title}</strong><p>{shot.detail}</p></figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function BlogPreview() {
  return (
    <section className="ml-blog-preview ml-shell">
      <div className="ml-blog-heading"><div><p className="ml-kicker ml-blue">05 · Field notes</p><h2>Privacy guides<br />for real life.</h2></div><a className="ml-text-link" href="/blog">View all articles <ArrowRight size={17} /></a></div>
      <div className="ml-blog-preview-list">{articles.slice(0, 3).map((article, index) => <a href={`/${article.slug}`} key={article.slug}><span>0{index + 1}</span><div><p>{article.category}</p><h3>{article.title}</h3></div><ArrowUpRight size={22} /></a>)}</div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    ['What is Mapplock?', 'Mapplock is an Android app lock and local photo vault with a private dashboard behind a secret place on a map.'],
    ['Do I have to travel to my secret place?', 'No. You navigate to the saved place on the map screen, double-tap inside its area and then authenticate.'],
    ['Does Mapplock replace my phone screen lock?', 'No. App locking adds another checkpoint for selected apps. Keep a strong Android screen lock enabled as well.'],
    ['What should I do before uninstalling?', 'Export or restore important local vault files first and confirm that the copies open outside Mapplock.'],
  ];
  return (
    <section id="faq" className="ml-faq ml-shell">
      <div><p className="ml-kicker">06 · Questions</p><h2>The useful<br />answers.</h2></div>
      <div className="ml-faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<Plus size={18} /></summary><p>{answer}</p></details>)}</div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="ml-final ml-shell">
      <img src="/visuals/mapplock-orbit-bg.png" alt="" loading="lazy" />
      <div><p className="ml-kicker">Your secret coordinate is waiting</p><h2>A more private<br /><span>you.</span></h2><p>Lock selected apps. Keep personal photos behind a place only you know.</p><div className="ml-final-actions"><Download placement="footer-cta" /><a className="ml-outline-button" href="/blog">Read the blog <ArrowUpRight size={17} /></a></div></div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="ml-footer ml-shell">
      <div className="ml-footer-brand"><Logo /><p>Map-based app lock and private photo vault for Android.</p><span>Made by AItoyz in Bhopal, India</span></div>
      <div><h2>Explore</h2><a href="/#features">Features</a><a href="/#how-it-works">How it works</a><a href="/#privacy">Privacy</a><a href="/#faq">FAQ</a></div>
      <div><h2>Resources</h2><a href="/blog">All blogs</a><a href="/how-to-lock-apps-on-android">App Lock guide</a><a href="/photo-vault">Photo vault</a><a href="/support">Support</a></div>
      <div><h2>Legal</h2><a href="/privacypolicy.html">Privacy policy</a><a href="/terms.html">Terms of use</a></div>
      <p className="ml-footer-bottom">© {new Date().getFullYear()} AItoyz. Same world, a more private you.</p>
    </footer>
  );
}

export function pageMetadata(path: string) {
  if (path === '/blog') return {
    title: 'Android Privacy & App Lock Blog | Mapplock',
    description: 'Practical guides on Android app locks, private photo vaults, mobile privacy and Mapplock.',
  };
  const article = articles.find((item) => `/${item.slug}` === path);
  if (article) return { title: `${article.title} | Mapplock`, description: article.intro };
  return { title: 'Mapplock: App Lock & Private Photo Vault for Android', description: product.description };
}

function BlogIndex() {
  return (
    <div className="ml-resource-site">
      <Header />
      <main id="main-content" className="ml-shell ml-resource">
        <a className="ml-breadcrumb" href="/">Home <ChevronRight size={13} /> Blog</a>
        <p className="ml-kicker ml-blue">Mapplock privacy guides</p>
        <h1>Android privacy,<br /><span>explained.</span></h1>
        <p className="ml-resource-intro">Practical guides for protecting selected apps, keeping personal photos private and using Mapplock with confidence.</p>
        <div className="ml-blog-list">{articles.map((article, index) => <a className="ml-blog-card" href={`/${article.slug}`} key={article.slug}><span className="ml-blog-index">{String(index + 1).padStart(2, '0')}</span><div><p className="ml-kicker">{article.category}</p><h2>{article.title}</h2><p>{article.intro}</p><strong>Read guide <ArrowRight size={16} /></strong></div>{article.image && <img src={`/screenshots/${article.image}.png`} alt="" loading="lazy" />}</a>)}</div>
      </main>
      <Footer />
    </div>
  );
}

function ArticlePage({ path }: { path: string }) {
  const article = articles.find((item) => `/${item.slug}` === path);
  if (!article) return null;
  const relatedArticles = article.related
    .map((slug) => articles.find((item) => item.slug === slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="ml-resource-site">
      <Header />
      <main id="main-content" className="ml-shell ml-resource ml-article-page">
        <a className="ml-breadcrumb" href="/blog">Home <ChevronRight size={13} /> Blog <ChevronRight size={13} /> Guide</a>
        <p className="ml-kicker ml-blue">{article.category}</p>
        <h1>{article.title}</h1>
        <div className={`ml-article-layout ${article.image ? '' : 'no-image'}`}>
          <article>
            <p className="ml-resource-intro">{article.intro}</p>
            {article.sections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.text}</p>{section.steps && <ol>{section.steps.map((step) => <li key={step}>{step}</li>)}</ol>}</section>)}
          </article>
          {article.image && <aside className="ml-article-image"><img src={`/screenshots/${article.image}.png`} alt="Mapplock on Android" /><span>Mapplock for Android</span></aside>}
        </div>
        {relatedArticles.length > 0 && <aside className="ml-related"><p className="ml-kicker ml-blue">Keep reading</p>{relatedArticles.map((item) => <a href={`/${item.slug}`} key={item.slug}>{item.title}<ArrowUpRight size={16} /></a>)}</aside>}
        <Download placement="article" />
      </main>
      <Footer />
    </div>
  );
}

function LandingPage() {
  return <><Header /><main id="main-content"><Hero /><HowItWorks /><FeatureShowcase /><Privacy /><Screens /><BlogPreview /><FAQ /><FinalCTA /></main><Footer /></>;
}

export default function Marketing({ path = '/' }: { path?: string }) {
  const metadata = pageMetadata(path);
  const article = articles.find((item) => `/${item.slug}` === path);
  const pageSchema = article ? {
    '@type': 'Article',
    headline: article.title,
    description: article.intro,
    mainEntityOfPage: new URL(path, window.location.origin).href,
    author: { '@type': 'Organization', name: product.developer },
    publisher: { '@type': 'Organization', name: product.developer },
    about: ['Android app lock', 'mobile privacy', 'Mapplock'],
  } : path === '/blog' ? {
    '@type': 'CollectionPage',
    name: 'Mapplock Android Privacy Blog',
    description: metadata.description,
    mainEntityOfPage: new URL(path, window.location.origin).href,
  } : undefined;

  usePageSeo(metadata.title, metadata.description, path, pageSchema);

  return (
    <div className="ml-site">
      <a className="ml-skip" href="#main-content">Skip to content</a>
      {article ? <ArticlePage path={path} /> : path === '/blog' ? <BlogIndex /> : <LandingPage />}
    </div>
  );
}
