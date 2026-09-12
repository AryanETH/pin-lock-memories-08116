import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronRight, Fingerprint, FolderLock, Image as ImageIcon, LockKeyhole, MapPin, Menu, Pause, Play, Plus, ShieldCheck, Smartphone, X } from 'lucide-react';
import { product, screenshots } from './product';
import { usePageSeo } from './seo';
import './marketing.css';

export function Download({ compact = false, placement = 'body' }: { compact?: boolean; placement?: string }) {
  return <a className={`ml-download ${compact ? 'compact' : ''}`} href={product.playUrl} target="_blank" rel="noopener noreferrer">
    <span>{compact ? 'Get Mapplock' : 'Get it on Google Play'}</span><ArrowUpRight size={18} />
  </a>;
}

function Logo() {
  return <a href="/" className="ml-logo"><span className="ml-logo-icon"><MapPin size={27} strokeWidth={2.4} /><LockKeyhole className="ml-logo-lock" size={10} /></span>mapplock<span className="ml-logo-period">.</span></a>;
}

function Header() {
  const [open, setOpen] = useState(false);
  return <header className="ml-header"><div className="ml-container ml-nav"><Logo /><nav id="main-navigation" className={open ? 'is-open' : ''} onClick={() => setOpen(false)} onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}>
    <a href="/#features">Features</a><a href="/#how-it-works">How it works</a><a href="/#privacy">Privacy</a><a href="/#faq">FAQ</a>
  </nav><div className="ml-nav-actions"><Download compact placement="navigation" /><button className="ml-menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div></div></header>;
}

function Phone({ kind, className = '', eager = false }: { kind: string; className?: string; eager?: boolean }) {
  return <div className={`ml-phone ${kind} ${className}`}><img src={`/screenshots/${kind}.png`} alt="" loading={eager ? 'eager' : 'lazy'} /></div>;
}

function MapLines() {
  return <svg className="ml-map-lines" viewBox="0 0 700 700" fill="none"><g stroke="currentColor" strokeWidth="1"><path d="M-50 390 120 420 250 335 390 355 730 180M-20 470 190 480 285 400 420 430 730 320M50 0 80 195 150 280 120 420 190 480 200 720M260-20 240 190 315 280 285 400 335 520 290 740M450-20 435 160 390 355 420 430 500 540 480 720M600-20 520 170 560 290 530 440 620 600M-20 170 80 195 240 190 435 160 520 170 740 140M-20 275 150 280 315 280 490 265 740 260M0 570 180 590 335 520 500 540 740 510M380 0 345 120 315 280M80 195 50 355 120 420M150 280 240 190M190 480 180 590 90 710M420 430 530 440 560 290M335 520 330 620 480 655 620 600 720 660" /></g><path d="M-30 670C140 520 330 580 390 360S460 210 730 70" stroke="currentColor" strokeWidth="20" opacity=".4"/><circle cx="390" cy="355" r="140" stroke="currentColor" strokeDasharray="4 8"/><circle cx="390" cy="355" r="230" stroke="currentColor" opacity=".4"/></svg>;
}

function Hero() {
  return <section className="ml-hero"><div className="ml-container ml-hero-grid"><div className="ml-hero-copy"><h1>Your privacy<br />has a <span>secret location.</span></h1><p className="ml-hero-description">Lock apps. Hide photos. Behind a place only you know.</p><div className="ml-hero-actions"><Download placement="hero" /></div><p className="ml-micro"><Smartphone size={14} /> Android · Made in Bhopal, India</p></div>
    <div className="ml-hero-art"><MapLines /><Phone kind="photo-vault" className="ml-hero-phone-back" eager /><Phone kind="weather-map" className="ml-hero-phone-front" eager /></div>
  </div></section>;
}

function ScreenshotGallery() {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const el = track.current;
    if (!el || paused || reduced || selected !== null) return;
    let id = 0, last = 0;
    const animate = (time: number) => {
      if (last && !el.matches(':hover, :focus-within') && !document.hidden) {
        el.scrollLeft += Math.min(time - last, 40) * .045;
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) el.scrollLeft -= half;
      }
      last = time; id = requestAnimationFrame(animate);
    };
    id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [paused, reduced, selected]);
  function show(index: number) { setSelected(index); dialog.current?.showModal(); }
  function close() { dialog.current?.close(); setSelected(null); }
  return <section id="inside" className="ml-gallery-section"><div className="ml-container ml-section-heading"><div><h2>App Lock & Photo Vault</h2></div><div className="ml-gallery-controls"><button className="ml-icon-button" onClick={() => setPaused(!paused)} disabled={reduced}>{paused || reduced ? <Play size={16} /> : <Pause size={16} />}</button></div></div>
    <div className="ml-gallery" ref={track} onPointerDown={() => setPaused(true)} onWheel={() => setPaused(true)}>
      {[0, 1].map(group => <div className="ml-gallery-group" key={group}>{screenshots.map((shot, i) => <button className="ml-shot" key={shot.file} tabIndex={group === 1 ? -1 : 0} onClick={() => show(i)}><span className="ml-shot-image"><img src={`/screenshots/${shot.file}.png`} alt={group === 0 ? shot.alt : ''} loading="lazy" width="282" height="500" /><span className="ml-shot-enlarge"><Plus size={17} /></span></span><span className="ml-shot-caption"><strong>{shot.title}</strong></span></button>)}</div>)}
    </div>
    <dialog ref={dialog} className="ml-lightbox" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === e.currentTarget) close(); }}><button autoFocus className="ml-lightbox-close ml-icon-button" onClick={close}><X /></button>{selected !== null && <img src={`/screenshots/${screenshots[selected].file}.png`} alt={screenshots[selected].alt} />}</dialog>
  </section>;
}

const steps = [
  { icon: MapPin, title: 'Pick your secret place.', text: 'Choose a location on the map.' },
  { icon: Fingerprint, title: 'Tap to unlock.', text: 'Return to your place and authenticate.' },
  { icon: FolderLock, title: 'Access your space.', text: 'Protected apps and photos.' },
];
function HowItWorks() {
  const [step, setStep] = useState(0);
  const ActiveIcon = steps[step].icon;
  return <section id="how-it-works" className="ml-how ml-container"><div className="ml-centered-heading"><h2>How It Works</h2></div><div className="ml-how-grid"><div className={`ml-demo ml-demo-step-${step}`}><MapLines /><div className="ml-demo-place"><div className="ml-demo-rings" /><span className="ml-demo-pin"><ActiveIcon size={35} /></span><strong>{steps[step].title}</strong><span>{steps[step].text}</span></div></div><div className="ml-steps">{steps.map((item, i) => <button key={item.title} className={`ml-step ${step === i ? 'active' : ''}`} onClick={() => setStep(i)}><span className="ml-step-number">0{i + 1}</span><span><strong>{item.title}</strong><span>{item.text}</span></span><ChevronRight size={19} /></button>)}</div></div></section>;
}

function Features() {
  return <section id="features" className="ml-features ml-container"><div className="ml-section-heading"><h2>Features</h2></div><div className="ml-feature-grid"><div className="ml-feature-card ml-feature-apps"><div className="ml-feature-top"><span className="ml-feature-icon"><LockKeyhole size={22} /></span></div><h3>App Lock</h3><p>Lock selected apps.</p><Phone kind="app-lock" /></div><div className="ml-feature-card ml-feature-photos"><div className="ml-feature-top"><span className="ml-feature-icon"><ImageIcon size={22} /></span></div><h3>Photo Vault</h3><p>Private photo storage.</p><Phone kind="photo-vault" /></div></div></section>;
}

function Privacy() {
  return <section id="privacy" className="ml-privacy"><div className="ml-container ml-privacy-grid"><div><h2>Privacy</h2><p>Your files stay on your device.</p></div><div className="ml-privacy-points"><div><Smartphone /><section><h3>On device</h3><p>Files stay local.</p></section></div><div><Fingerprint /><section><h3>Authentication</h3><p>PIN, pattern, or fingerprint.</p></section></div><div><ShieldCheck /><section><h3>Secure</h3><p>Your data, your control.</p></section></div></div></div></section>;
}

function FAQ() {
  const faqs = [
    ['What is Mapplock?', 'An Android app lock and photo vault. Choose a secret map location to access protected content.'],
    ['How does it work?', 'Choose a secret location. Return to that place, tap, and authenticate to unlock.'],
    ['Is my data safe?', 'Your files stay on your device.'],
  ];
  return <section id="faq" className="ml-faq ml-container"><div><h2>FAQ</h2></div><div className="ml-faq-list">{faqs.map(([q, a]) => <details key={q}><summary>{q}<Plus size={19} /></summary><p>{a}</p></details>)}</div></section>;
}

function FinalCTA() { 
  return <section className="ml-final ml-container"><h2>Ready to protect<br /><span>your privacy?</span></h2><Download placement="footer-cta" /></section>; 
}

function Footer() {
  return <footer className="ml-footer ml-container"><div className="ml-footer-main"><div><Logo /><p>Made by AItoyz in Bhopal, India</p></div><div><h2>Product</h2><a href="/#features">Features</a><a href="/#how-it-works">How it works</a><a href="/#privacy">Privacy</a><a href="/#faq">FAQ</a></div><div><h2>Legal</h2><a href="/privacypolicy.html">Privacy Policy</a><a href="/terms.html">Terms of Use</a></div></div><div className="ml-footer-bottom"><span>© {new Date().getFullYear()} AItoyz</span></div></footer>;
}

export function pageMetadata(path: string) {
  return { 
    title: 'Mapplock: App Lock & Private Photo Vault for Android', 
    description: product.description 
  };
}

export default function Marketing({ path = '/' }: { path?: string }) {
  const metadata = pageMetadata(path);
  usePageSeo(metadata.title, metadata.description, path);
  return <div className="ml-site"><Header /><main id="main-content"><Hero /><ScreenshotGallery /><HowItWorks /><Features /><Privacy /><FAQ /><FinalCTA /></main><Footer /></div>;
}
