import { FormEvent, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Check, Compass, Globe2, Info, LockKeyhole, MapPin, Search, Sparkles, X } from 'lucide-react';
import { product } from '@/marketing/product';
import { usePageSeo } from '@/marketing/seo';
import ScrollGlobe from '@/components/ScrollGlobe';
import './interactive.css';

type Place = { name: string; lat: number; lng: number };
type Phase = 'space' | 'arriving' | 'map' | 'chosen';
type SearchResult = { place_id: number; display_name: string; lat: string; lon: string };

function SearchPlaces({ onSelect, onFocus }: { onSelect: (place: Place) => void; onFocus?: () => void }) {
  const [query, setQuery] = useState(''); const [results, setResults] = useState<SearchResult[]>([]); const [loading, setLoading] = useState(false); const [open, setOpen] = useState(false); const abort = useRef<AbortController | null>(null);
  useEffect(() => { if (query.trim().length < 3) { setResults([]); setOpen(false); return; } const timer = window.setTimeout(async () => { abort.current?.abort(); const controller = new AbortController(); abort.current = controller; setLoading(true); try { const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`, { signal: controller.signal, headers: { Accept: 'application/json' } }); const data = await response.json(); setResults(data); setOpen(true); } catch (error) { if ((error as Error).name !== 'AbortError') setResults([]); } finally { if (!controller.signal.aborted) setLoading(false); } }, 320); return () => window.clearTimeout(timer); }, [query]);
  const select = (item: SearchResult) => { const place = { name: item.display_name.split(',').slice(0, 2).join(', '), lat: Number(item.lat), lng: Number(item.lon) }; setQuery(place.name); setOpen(false); onSelect(place); };
  const submit = (event: FormEvent) => { event.preventDefault(); if (results[0]) select(results[0]); };
  return <div className="mi-search-wrap"><form className="mi-search" onSubmit={submit}><Search size={19} aria-hidden="true" /><input value={query} onFocus={onFocus} onChange={e => setQuery(e.target.value)} placeholder="Search any place" aria-label="Search for a place" autoComplete="off" /><button type="submit" aria-label="Search" disabled={!query.trim()}>{loading ? <span className="mi-spinner" /> : <Compass size={18} />}</button></form>{open && <div className="mi-results" role="listbox" aria-label="Place search results">{results.length ? results.map(result => <button type="button" role="option" key={result.place_id} onMouseDown={e => e.preventDefault()} onClick={() => select(result)}><MapPin size={15} /><span>{result.display_name}</span></button>) : <p>No places found. Try another search.</p>}</div>}</div>;
}

function PlaceMap({ place, onPick }: { place: Place; onPick: (point: Place) => void }) {
  const host = useRef<HTMLDivElement>(null); const map = useRef<L.Map | null>(null); const marker = useRef<L.Marker | null>(null); const longPress = useRef<number | null>(null);
  useEffect(() => { if (!host.current || map.current) return; const instance = L.map(host.current, { zoomControl: false, attributionControl: true, preferCanvas: true }).setView([place.lat, place.lng], 15); L.control.zoom({ position: 'bottomright' }).addTo(instance); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(instance); const pointName = (lat: number, lng: number) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`; const choose = (lat: number, lng: number) => { marker.current?.remove(); marker.current = L.marker([lat, lng], { icon: L.divIcon({ className: 'mi-map-marker', html: '<span></span>', iconSize: [34, 34], iconAnchor: [17, 31] }) }).addTo(instance); onPick({ name: pointName(lat, lng), lat, lng }); }; const cancel = () => { if (longPress.current) window.clearTimeout(longPress.current); longPress.current = null; }; instance.on('mousedown touchstart', (event: L.LeafletMouseEvent) => { cancel(); longPress.current = window.setTimeout(() => { choose(event.latlng.lat, event.latlng.lng); cancel(); }, 650); }); instance.on('mouseup touchend mouseout', cancel); instance.on('click', (event: L.LeafletMouseEvent) => choose(event.latlng.lat, event.latlng.lng)); map.current = instance; return () => { cancel(); instance.remove(); map.current = null; }; }, []);
  useEffect(() => { if (!map.current) return; map.current.flyTo([place.lat, place.lng], 15, { duration: 1.35 }); }, [place.lat, place.lng]);
  return <div className="mi-map" ref={host} aria-label={`OpenStreetMap centered on ${place.name}`} />;
}

export default function InteractiveMode({ onAbout }: { onAbout: () => void }) {
  const [phase, setPhase] = useState<Phase>('space'); 
  const [place, setPlace] = useState<Place>({ name: 'the world', lat: 22.7196, lng: 75.8577 }); 
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const leavingTimer = useRef<number | null>(null);
  
  usePageSeo('Mapplock: App Lock & Private Photo Vault for Android', product.description, '/');
  
  const goToPlace = (next: Place) => { 
    setPlace(next); 
    setPhase('arriving');
    // Animate scroll progress to simulate zoom
    let progress = 0;
    const animateZoom = () => {
      progress += 0.02;
      if (progress <= 1) {
        setScrollProgress(progress);
        setIsScrolling(true);
        requestAnimationFrame(animateZoom);
      } else {
        setIsScrolling(false);
        setPhase('map');
      }
    };
    animateZoom();
  };
  
  useEffect(() => () => { if (leavingTimer.current) window.clearTimeout(leavingTimer.current); }, []);
  
  const choosePoint = (point: Place) => { setPlace(point); setPhase('chosen'); };
  
  return <main className={`mi-site mi-phase-${phase}`}>
    <div className="mi-space" aria-hidden="true">
      <div className="mi-stars" />
      <div className="mi-comet mi-comet-one" />
      <div className="mi-comet mi-comet-two" />
    </div>
    
    <header className="mi-header">
      <a href="/" className="mi-brand" aria-label="Mapplock interactive home">
        <span><MapPin size={19} /><LockKeyhole size={8} /></span>mapplock
      </a>
      <div className="mi-mode-controls" role="group" aria-label="Website mode">
        <button type="button" className="is-active" aria-current="page" aria-label="Interactive mode">
          <Globe2 size={18} />
        </button>
        <button type="button" onClick={onAbout} aria-label="About Mapplock">
          <Info size={18} />
        </button>
      </div>
    </header>
    
    <section className="mi-stage" aria-labelledby="interactive-title">
      <div className="mi-globe-wrap">
        <ScrollGlobe scrollProgress={scrollProgress} isScrolling={isScrolling} />
        <div className="mi-signal" />
        <span className="mi-coordinate">22°43′N · 75°51′E</span>
      </div>
      
      <div className="mi-copy">
        <p className="mi-kicker"><Sparkles size={13} /> Find your private place</p>
        <h1 id="interactive-title">A map can keep<br /><span>a secret.</span></h1>
        <p className="mi-intro">Search the world, choose a place, and make it the entrance to your private space.</p>
        <SearchPlaces onSelect={goToPlace} onFocus={() => phase === 'space' && setPhase('space')} />
        <p className="mi-search-hint">Search for a city, address, landmark or favourite corner of the map.</p>
      </div>
      
      <div className="mi-stage-footer">
        <span>MAPPLOCK · INTERACTIVE</span>
        <span>Drag the stars. Find your spot.</span>
      </div>
    </section>
    
    <section className="mi-map-stage" aria-live="polite">
      <PlaceMap place={place} onPick={choosePoint} />
      <div className="mi-map-top">
        <SearchPlaces onSelect={goToPlace} />
        <button type="button" className="mi-round-control" onClick={() => { setPhase('space'); setScrollProgress(0); }} aria-label="Return to the Earth">
          <Globe2 size={18} />
        </button>
        <button type="button" className="mi-round-control" onClick={onAbout} aria-label="Open About Mapplock">
          <Info size={18} />
        </button>
      </div>
      <div className="mi-map-instruction">
        <span><MapPin size={19} /></span>
        <div>
          <strong>Choose your secret spot.</strong>
          <p>Long-press anywhere on the map. A tap works too.</p>
        </div>
      </div>
      {phase === 'chosen' && <div className="mi-choice-bar" role="status">
        <button type="button" className="mi-choice-close" onClick={() => setPhase('map')} aria-label="Choose another spot">
          <X size={17} />
        </button>
        <p><Check size={15} /> Secret place selected</p>
        <strong>{place.name}</strong>
        <span>This will be the map entrance to your private space.</span>
        <a href={product.playUrl} target="_blank" rel="noopener noreferrer" className="mi-play-cta">
          Continue on Google Play <span>↗</span>
        </a>
        <small><LockKeyhole size={13} /> Lock apps &amp; vault personal photos</small>
      </div>}
    </section>
    
    <noscript>
      <section className="mi-noscript">
        <h2>Mapplock: App Lock &amp; Private Photo Vault for Android</h2>
        <p>Mapplock is an Android app lock and local private vault by AItoyz. Choose a secret map entrance, then lock selected apps and private photos.</p>
        <a href={product.playUrl}>Get it on Google Play</a>
        <a href="/about">Learn about Mapplock</a>
      </section>
    </noscript>
  </main>;
}
