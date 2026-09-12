import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Moon, Sun, Eye, Lock, Share2, Map as MapIcon, BookOpen, Globe as Earth } from 'lucide-react';
import SimpleMap from '@/components/SimpleMap';
import mapxLogo from '@/assets/mapx-logo.png';
import CreatePinModal from '@/components/CreatePinModal';
import UnlockPinModal from '@/components/UnlockPinModal';
import FileViewer from '@/components/FileViewer';
import SearchBar from '@/components/SearchBar';
import FactCard, { LocationFact } from '@/components/FactCard';
import SavedFactsMenu from '@/components/SavedFactsMenu';
import ScrollGlobe from '@/components/ScrollGlobe';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/contexts/ThemeContext';
import { Pin, savePin, getAllPins, updatePin, logAccess, getOrCreateDeviceId, deletePin } from '@/lib/db';
import { calculateDistance, getCurrentPosition } from '@/lib/geo';
import { toast } from 'sonner';
import { Map as LeafletMap } from 'leaflet';
import { supabase } from '@/integrations/supabase/client';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
 

export default function Index() {
  const { theme, toggleTheme } = useTheme();
  const [pins, setPins] = useState<Pin[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [retapModalOpen, setRetapModalOpen] = useState(false);
  const [retapTargetPin, setRetapTargetPin] = useState<Pin | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [locationShareModalOpen, setLocationShareModalOpen] = useState(false);
  const [sharedLocation, setSharedLocation] = useState<{ lat: number; lng: number; zoom: number; pinId?: string } | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [factMode, setFactMode] = useState(false);
  const [currentFact, setCurrentFact] = useState<LocationFact | null>(null);
  const [savedFacts, setSavedFacts] = useState<LocationFact[]>([]);
  const [savedFactsMenuOpen, setSavedFactsMenuOpen] = useState(false);
  const [loadingFact, setLoadingFact] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [anchorCoords, setAnchorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currentLandingCity, setCurrentLandingCity] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [stopGlobeAnimation, setStopGlobeAnimation] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollEndMessage, setShowScrollEndMessage] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // Custom cursor tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };

    if (showLanding) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [showLanding]);

  // Scroll-based progress tracking with GSAP
  useEffect(() => {
    if (!showLanding || !scrollContainerRef.current) return;

    // Enable body scroll
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';

    // GSAP ScrollTrigger for smooth progress tracking
    ScrollTrigger.create({
      trigger: scrollContainerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      onUpdate: (self) => {
        setScrollProgress(self.progress);
        setIsScrolling(true);
        
        // Clear existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        // Set new timeout to detect when scrolling stops
        scrollTimeoutRef.current = setTimeout(() => {
          setIsScrolling(false);
        }, 150);
        
        // Track if user has reached bottom
        if (self.progress >= 0.99) {
          setHasReachedBottom(true);
        }
      },
    });

    // Detect overscroll at bottom
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      
      // Show message only when user tries to scroll past the bottom
      if (hasReachedBottom && scrollTop + clientHeight >= scrollHeight - 5) {
        setShowScrollEndMessage(true);
      } else {
        setShowScrollEndMessage(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [showLanding, hasReachedBottom]);
 
  // No separate route; landing toggles to map view
  
  // Local private pins cache (for devices without auth)
  const LOCAL_PINS_KEY = 'local-pins';
  const loadLocalPins = (): Pin[] => {
    try {
      const raw = localStorage.getItem(LOCAL_PINS_KEY);
      return raw ? (JSON.parse(raw) as Pin[]) : [];
    } catch {
      return [];
    }
  };
  const saveLocalPins = (pinsToSave: Pin[]) => {
    try {
      localStorage.setItem(LOCAL_PINS_KEY, JSON.stringify(pinsToSave));
    } catch {}
  };
  const mergePins = (a: Pin[], b: Pin[]) => {
    const map = new Map<string, Pin>();
    [...a, ...b].forEach(p => map.set(p.id, p));
    return Array.from(map.values());
  };
  useEffect(() => {
    // Check if there are URL params (shared link) - if so, skip landing page
    const urlParams = new URLSearchParams(window.location.search);
    const hasSharedLink = urlParams.has('lat') && urlParams.has('lng');
    
    if (hasSharedLink) {
      setShowLanding(false);
      setFactMode(true); // Enable fact mode for shared links
    }
    
    loadPins();
    // Removed automatic location access - user location will only be requested when needed
    loadSavedFacts();
  }, []);

  const loadSavedFacts = () => {
    try {
      const saved = localStorage.getItem('saved-facts');
      if (saved) {
        setSavedFacts(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load saved facts:', error);
    }
  };

  const saveFact = (fact: LocationFact) => {
    const updated = [...savedFacts, fact];
    setSavedFacts(updated);
    localStorage.setItem('saved-facts', JSON.stringify(updated));
  };

  const deleteSavedFact = (index: number) => {
    const updated = savedFacts.filter((_, i) => i !== index);
    setSavedFacts(updated);
    localStorage.setItem('saved-facts', JSON.stringify(updated));
    toast.success('Fact deleted');
  };

  // Handle URL params after pins are loaded or when landing is skipped
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasSharedLink = urlParams.has('lat') && urlParams.has('lng');
    
    // Call handleUrlParams if we have a shared link and either:
    // 1. Pins are loaded (for pinId lookup), or
    // 2. There's no pinId in the URL (just coordinates)
    if (hasSharedLink && (pins.length > 0 || !urlParams.has('pinId'))) {
      handleUrlParams();
    }
  }, [pins, showLanding]);

  const handleUrlParams = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const lat = urlParams.get('lat');
    const lng = urlParams.get('lng');
    const zoom = urlParams.get('zoom');
    const pinId = urlParams.get('pinId');

    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      const zoomNum = zoom ? parseInt(zoom) : 15;
      
      // Set the shared location for the modal
      setSharedLocation({ lat: latNum, lng: lngNum, zoom: zoomNum });
      setAnchorCoords({ lat: latNum, lng: lngNum });
      // Center map if available
      if (mapRef.current) {
        mapRef.current.setView([latNum, lngNum], zoomNum);
      }
      // Auto-fetch and display relevant information
      setLoadingFact(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-location-fact', {
          body: { lat: latNum, lng: lngNum }
        });
        if (!error) {
          setCurrentFact(data);
        }
      } catch (e) {
        console.error('Failed to fetch fact from shared link:', e);
      } finally {
        setLoadingFact(false);
      }
      
      // If there's a pinId, try to find and open that pin
      if (pinId) {
        const targetPin = pins.find(p => p.id === pinId);
        if (targetPin) {
          setSelectedPin(targetPin);
          setUnlockModalOpen(true);
        }
      }
    }
  };

  const loadPins = async () => {
    try {
      const allPins = await getAllPins();
      setPins(mergePins(allPins, loadLocalPins()));
    } catch (error) {
      toast.error('Failed to load pins');
    }
  };
  const getUserLocation = async () => {
    try {
      const position = await getCurrentPosition();
      setUserLocation([position.coords.latitude, position.coords.longitude]);
    } catch (error) {
      console.warn('Geolocation not available');
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    // If in fact mode, fetch and display a fact
    if (factMode) {
      setLoadingFact(true);
      setAnchorCoords({ lat, lng });
      try {
        const { data, error } = await supabase.functions.invoke('get-location-fact', {
          body: { lat, lng }
        });
        
        if (error) throw error;
        
        setCurrentFact(data);
      } catch (error) {
        console.error('Failed to fetch fact:', error);
        toast.error('Failed to fetch location fact');
      } finally {
        setLoadingFact(false);
      }
      return;
    }

    // Otherwise, normal pin logic
    const existing = pins.find((p) => calculateDistance(lat, lng, p.lat, p.lng) <= p.radius);
    if (existing) {
      setRetapTargetPin(existing);
      setRetapModalOpen(true);
      return;
    }
    setPendingLocation({ lat, lng });
    setCreateModalOpen(true);
  };

  const handlePinClick = (pin: Pin) => {
    // Marker tap unlock
    setSelectedPin(pin);
    setUnlockModalOpen(true);
  };

  const handleSavePin = async (pin: Pin) => {
    try {
      // Save to Supabase
      await savePin(pin);
      
      // Persist locally so this device can access private memories without auth
      const locals = loadLocalPins();
      const mergedLocals = mergePins(locals, [pin]);
      saveLocalPins(mergedLocals);
      
      // Update state immediately with the new pin
      setPins(prev => mergePins(prev, [pin]));
      
      toast.success('Memory saved successfully! 🔒');
    } catch (error) {
      toast.error('Failed to save pin');
      console.error('Save error:', error);
    }
  };
  const handleUnlock = (pin: Pin) => {
    setSelectedPin(pin);
    setGalleryOpen(true);
    logAccess(pin.id, 'pin');
  };

  const handleAppendToExisting = () => {
    if (!retapTargetPin || !pendingLocation) return;
    setCreateModalOpen(true);
  };

  const handleShareClick = () => {
    if (!retapTargetPin) return;
    setShareModalOpen(true);
  };

  const handleGenerateShare = async (pin: Pin) => {
    const token = crypto.randomUUID().replace(/-/g, '') + Math.random().toString(36).slice(2, 10);
    await updatePin(pin.id, { shareToken: token });
    await loadPins();
  };

  const handleRevokeShare = async (pin: Pin) => {
    await updatePin(pin.id, { shareToken: null });
    await loadPins();
  };

  const handleShareLocation = (lat: number, lng: number, zoom: number, pinId?: string) => {
    setSharedLocation({ lat, lng, zoom, pinId });
    setLocationShareModalOpen(true);
  };

  const generateLocationShareLink = (lat: number, lng: number, zoom: number, pinId?: string) => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
      zoom: zoom.toString()
    });
    if (pinId) {
      params.set('pinId', pinId);
    }
    return `${baseUrl}?${params.toString()}`;
  };

  const handleSearchSelect = (lat: number, lng: number) => {
    // On landing: transition to Fact Mode map focused on location
    if (showLanding) {
      setShowLanding(false);
      setFactMode(true);
      // Delay to allow map mount, then focus
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 15);
        }
      }, 50);
      return;
    }
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 15);
    }
  };

  const diveIntoCurrentCity = async () => {
    // Stop the globe animation before transitioning
    setStopGlobeAnimation(true);
    
    // Transition to Fact Mode and focus on the currently displayed landing city
    setShowLanding(false);
    setFactMode(true);
    const target = currentLandingCity;
    if (!target) return;
    const lat = target.lat;
    const lng = target.lon;
    setAnchorCoords({ lat, lng });
    // Allow map to mount
    setTimeout(async () => {
      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 15);
      }
      setLoadingFact(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-location-fact', {
          body: { lat, lng }
        });
        if (!error) {
          setCurrentFact(data);
        }
      } catch (e) {
        console.error('Failed to fetch fact for landing city:', e);
        toast.error('Failed to load fact for this city');
      } finally {
        setLoadingFact(false);
      }
    }, 120);
  };

  const handleDeletePin = async (pin: Pin) => {
    try {
      await deletePin(pin.id);
      await loadPins();
      toast.success('Pin deleted successfully');
    } catch (error) {
      toast.error('Failed to delete pin');
    }
  };

  const handleSelectSavedFact = (fact: LocationFact) => {
    if (mapRef.current) {
      mapRef.current.setView([fact.coordinates.lat, fact.coordinates.lng], 15);
      setCurrentFact(fact);
    }
  };

  return (
    <div className="relative w-full bg-background" style={{ minHeight: '100vh', overflow: showLanding ? 'visible' : 'hidden' }}>
      {/* Header is hidden on landing to match the cinematic hero */}
      {!showLanding && (
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="absolute top-0 left-0 right-0 z-10 p-2 md:p-4"
        >
          <div className="px-3 py-2 md:px-6 md:py-3 flex items-center justify-center gap-2 md:gap-6 rounded-xl md:rounded-2xl bg-background border shadow-md">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-1 md:gap-2"
            >
              <img
                src={mapxLogo}
                alt="Logo"
                className={`w-6 h-6 md:w-8 md:h-8 object-contain drop-shadow ${theme === 'dark' ? 'invert' : ''}`}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex-1 max-w-xs md:max-w-md"
            >
              <SearchBar onSelectLocation={handleSearchSelect} />
            </motion.div>

            <div className="flex items-center gap-1 md:gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full w-8 h-8 md:w-10 md:h-10"
                title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  <Sun className="w-4 h-4 md:w-5 md:h-5" />
                )}
              </Button>
              <Button
                variant={factMode ? 'default' : 'ghost'}
                size="icon"
                onClick={() => {
                  const next = !factMode;
                  setFactMode(next);
                  setCurrentFact(null);
                  if (!next) setSavedFactsMenuOpen(false);
                  toast.success(factMode ? 'Lock Memory Mode Activated' : 'Discover Mode Activated 🌍');
                }}
                className="rounded-full w-8 h-8 md:w-10 md:h-10"
                title={factMode ? 'Switch to Lock Memory Mode' : 'Discover Where You Tap'}
              >
                {factMode ? <Lock className="w-4 h-4 md:w-5 md:h-5" /> : <Earth className="w-4 h-4 md:w-5 md:h-5" />}
              </Button>
              {factMode && (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setSavedFactsMenuOpen(true)}
                  className="rounded-full shadow-lg bg-secondary hover:bg-secondary/90 border relative w-8 h-8 md:w-10 md:h-10"
                  title="Saved Places"
                >
                  <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
                  {savedFacts.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] md:text-xs rounded-full min-w-[16px] md:min-w-[20px] h-4 md:h-5 flex items-center justify-center font-bold px-1">
                      {savedFacts.length}
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.header>
      )}

      {/* Landing or Map */}
      {showLanding ? (
        <div 
          ref={scrollContainerRef} 
          className="relative w-full bg-black touch-pan-y" 
          style={{ 
            height: '200vh', 
            overflow: 'visible',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y'
          }}
        >
          {/* Fixed 3D Globe Container with blur effect */}
          <div 
            className="fixed inset-0 w-full h-screen flex items-center justify-center bg-black overflow-hidden z-0 transition-all duration-300"
            style={{
              filter: `blur(${scrollProgress * 8}px)`,
              opacity: 1 - (scrollProgress * 0.3)
            }}
          >
            <ScrollGlobe scrollProgress={scrollProgress} isScrolling={isScrolling} />
          </div>

          {/* Dark overlay that increases with scroll */}
          <div 
            className="fixed inset-0 bg-black pointer-events-none z-[5] transition-opacity duration-300"
            style={{
              opacity: scrollProgress * 0.4
            }}
          />

          {/* Overlay Content */}
          <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            {/* Logo at top left */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute top-4 md:top-8 left-4 md:left-8 flex items-center gap-2 md:gap-3"
            >
              <img 
                src="/removed_background (18).png" 
                alt="Mapplock Logo" 
                className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-2xl"
              />
              <span className="text-2xl md:text-3xl font-bold text-white drop-shadow-2xl">
                Mapplock
              </span>
            </motion.div>

            {/* Download Mapplock at top right */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="absolute top-4 md:top-8 right-4 md:right-8 pointer-events-auto"
            >
              <div className="relative">
                {/* Animated glow effect */}
                <div className="absolute inset-0 rounded-full bg-white/30 blur-md animate-pulse" />
                <Button
                  size="sm"
                  onClick={() => {
                    window.open('https://play.google.com/store/apps/details?id=com.aitoyz.mapplock', '_blank');
                  }}
                  className="relative bg-transparent hover:bg-white/10 text-white font-bold px-4 md:px-6 py-2 md:py-2.5 text-xs md:text-sm rounded-full shadow-2xl transition-all duration-300 hover:scale-105 border-2 border-white animate-border-pulse"
                  style={{
                    animation: 'borderPulse 2s ease-in-out infinite'
                  }}
                >
                  Download Mapplock
                </Button>
              </div>
            </motion.div>

            {/* Scroll Indicator - visible at start */}
            {scrollProgress < 0.15 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="absolute bottom-8 md:bottom-12 flex flex-col items-center gap-2"
              >
                <span className="text-white/80 text-xs md:text-sm tracking-wider font-medium">SCROLL TO EXPLORE</span>
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <div className="w-5 h-8 md:w-6 md:h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
                    <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-white rounded-full" />
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Scroll End Message - visible only when user tries to scroll past bottom */}
            {showScrollEndMessage && hasReachedBottom && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.5 }}
                className="absolute bottom-8 md:bottom-12 flex flex-col items-center gap-3 z-20"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-white"
                >
                  <svg 
                    width="32" 
                    height="32" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="w-8 h-8 md:w-10 md:h-10"
                  >
                    <path d="M12 19V5M5 12l7-7 7 7"/>
                  </svg>
                </motion.div>
                <span className="text-white/90 text-sm md:text-base tracking-wider font-medium text-center px-4">
                  There's only way up
                </span>
              </motion.div>
            )}

            {/* CTA Button - visible at end */}
            {scrollProgress > 0.75 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="pointer-events-auto w-full max-w-7xl mx-auto px-6 md:px-12"
              >
                <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8 lg:gap-4 w-full">

                  {/* ── LEFT COLUMN ── */}
                  <div className="flex flex-col items-start gap-5 max-w-lg w-full">

                    {/* Pill badge */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm"
                    >
                      <svg className="w-3.5 h-3.5 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                      <span className="text-white/90 text-xs font-semibold tracking-widest uppercase">World's First Geo-Lock</span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-4xl sm:text-5xl md:text-6xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight"
                      style={{ textShadow: '0 4px 24px rgba(0,0,0,0.8)' }}
                    >
                      Your Secrets<br />
                      Have a{' '}
                      <span style={{ color: '#3B82F6' }}>Location</span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-white/70 text-base md:text-lg font-normal leading-relaxed max-w-sm"
                      style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
                    >
                      Lock apps, photos &amp; files behind a place only you know.
                    </motion.p>

                    {/* Download button */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center gap-3"
                    >
                      <a
                        href="https://play.google.com/store/apps/details?id=com.aitoyz.mapplock"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-5 py-3 rounded-full font-bold text-white text-sm md:text-base transition-all duration-300 hover:scale-105 hover:brightness-110 shadow-xl"
                        style={{ background: 'linear-gradient(90deg, #1a73e8 0%, #0ea5e9 100%)' }}
                      >
                        <img src="/google play.png" alt="" className="w-5 h-5 object-contain" />
                        Download Mapplock
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                      </a>

                      {/* Watch demo */}
                      <button
                        onClick={() => setVideoModalOpen(true)}
                        className="group flex items-center justify-center w-11 h-11 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105"
                        title="Watch Demo"
                      >
                        <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </button>
                    </motion.div>

                    {/* Trust badges */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center gap-4 flex-wrap"
                    >
                      {[
                        { icon: '🏷️', label: 'Free' },
                        { icon: '🚫', label: 'No Ads' },
                        { icon: '🇮🇳', label: 'Made in Bhopal, India' },
                      ].map((badge) => (
                        <span key={badge.label} className="flex items-center gap-1.5 text-white/60 text-xs font-medium">
                          <span>{badge.icon}</span>
                          {badge.label}
                        </span>
                      ))}
                    </motion.div>

                    {/* Product Hunt badge */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <a
                        href="https://www.producthunt.com/products/mapplock?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-mapplock"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-transform duration-300 hover:scale-105 inline-block"
                      >
                        <img
                          alt="Mapplock on Product Hunt"
                          width="200"
                          height="43"
                          src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1247900&theme=dark&t=1789152952469"
                        />
                      </a>
                    </motion.div>
                  </div>

                  {/* ── RIGHT COLUMN — Phone mockup ── */}
                  <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.7 }}
                    className="relative flex-shrink-0 hidden lg:block"
                  >
                    {/* Handwritten annotation */}
                    <div className="absolute -right-20 top-1/3 text-white/60 text-sm italic font-light text-center leading-tight" style={{ fontFamily: 'cursive', transform: 'rotate(8deg)' }}>
                      Anywhere<br />can be your<br />lock
                    </div>

                    {/* Phone frame */}
                    <div className="relative w-56 md:w-64" style={{ filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.7))' }}>
                      {/* Outer phone shell */}
                      <div className="relative bg-gray-900 rounded-[2.5rem] border-4 border-gray-700 overflow-hidden" style={{ aspectRatio: '9/19' }}>
                        {/* Status bar */}
                        <div className="flex justify-between items-center px-4 pt-3 pb-1 bg-gray-900">
                          <span className="text-white/80 text-[9px] font-semibold">9:41</span>
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-2 text-white" fill="currentColor" viewBox="0 0 24 16"><rect x="0" y="4" width="4" height="12" rx="1"/><rect x="6" y="2" width="4" height="14" rx="1"/><rect x="12" y="0" width="4" height="16" rx="1"/><rect x="18" y="0" width="4" height="16" rx="1" opacity="0.3"/></svg>
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                            <svg className="w-4 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 12"><rect x="0.5" y="0.5" width="20" height="11" rx="2" stroke="currentColor" strokeWidth="1" fill="none"/><rect x="2" y="2" width="14" height="8" rx="1"/><path d="M22 4v4a2 2 0 000-4z"/></svg>
                          </div>
                        </div>

                        {/* App header */}
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-900">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                            </div>
                            <span className="text-white text-[10px] font-bold">Mapplock</span>
                          </div>
                          <div className="w-4" />
                        </div>

                        {/* Map area */}
                        <div className="relative bg-[#1a2535] mx-2 rounded-xl overflow-hidden" style={{ height: '110px' }}>
                          {/* Grid lines */}
                          <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 60">
                            <defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#4FC3F7" strokeWidth="0.3"/></pattern></defs>
                            <rect width="100" height="60" fill="url(#grid)"/>
                          </svg>
                          {/* Radius circle */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div className="w-16 h-16 rounded-full border border-blue-400/40 bg-blue-500/10 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full border border-blue-400/60 bg-blue-500/20 flex items-center justify-center">
                                <div className="w-5 h-5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Tooltip */}
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white rounded-full px-2 py-0.5 flex items-center gap-1 shadow-lg whitespace-nowrap">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="text-gray-800 text-[8px] font-semibold">Your secret place 🔒</span>
                          </div>
                        </div>

                        {/* App grid */}
                        <div className="grid grid-cols-2 gap-1.5 px-2 pt-2">
                          {[
                            { label: 'Apps', color: '#3B82F6', icon: (
                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z"/></svg>
                            )},
                            { label: 'Photos', color: '#22C55E', icon: (
                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                            )},
                            { label: 'Audio', color: '#A855F7', icon: (
                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                            )},
                            { label: 'Files', color: '#F59E0B', icon: (
                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                            )},
                          ].map((item) => (
                            <div key={item.label} className="flex flex-col items-center justify-center gap-1 rounded-xl py-2.5" style={{ background: item.color }}>
                              {item.icon}
                              <span className="text-white text-[9px] font-semibold">{item.label}</span>
                            </div>
                          ))}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-center gap-1.5 mx-2 mt-1.5 mb-2 py-1.5 rounded-xl bg-gray-800/80">
                          <svg className="w-3 h-3 text-white/60" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                          <span className="text-white/50 text-[8px] font-medium tracking-wider">Private. Local. Yours.</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* ── BOTTOM FEATURES BAR ── */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="mt-8 w-full grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden backdrop-blur-sm border border-white/10"
                >
                  {[
                    { icon: '🛡️', title: 'App Lock', desc: 'Keep your apps private' },
                    { icon: '🖼️', title: 'Photo Vault', desc: 'Hide your memories' },
                    { icon: '📄', title: 'Files & Docs', desc: 'Secure what matters' },
                    { icon: '📍', title: 'Map Based Access', desc: 'A place only you know' },
                  ].map((feat) => (
                    <div key={feat.title} className="flex items-center gap-3 px-4 py-4 bg-black/40">
                      <span className="text-xl flex-shrink-0">{feat.icon}</span>
                      <div>
                        <p className="text-white font-semibold text-sm">{feat.title}</p>
                        <p className="text-white/50 text-xs mt-0.5">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 pt-16 md:pt-24 pb-4 md:pb-8 px-2 md:px-6 lg:px-8 flex items-center justify-center">
          <SimpleMap
            pins={pins}
            onMapClick={handleMapClick}
            onPinClick={handlePinClick}
            userLocation={userLocation}
            onShareLocation={handleShareLocation}
            onMapReady={(map) => { mapRef.current = map; }}
            anchoredLatLng={currentFact ? { lat: currentFact.coordinates.lat, lng: currentFact.coordinates.lng } : anchorCoords || undefined}
            overlayContent={(anchor) => (
              <>
                {/* Small anchored dot to stick to clicked location */}
                {anchor && (
                  <div
                    className="absolute z-[1001] pointer-events-none"
                    style={{ left: `${anchor.x}px`, top: `${anchor.y}px`, transform: 'translate(-50%, -50%)' }}
                  >
                    <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#4FC3F7] ring-1 md:ring-2 ring-white dark:ring-black shadow-[0_0_10px_rgba(79,195,247,0.8)] md:shadow-[0_0_14px_rgba(79,195,247,0.8)]" />
                  </div>
                )}

                {(loadingFact || currentFact) ? (
                  <FactCard
                    fact={currentFact}
                    isLoading={loadingFact}
                    onClose={() => {
                      setCurrentFact(null);
                      setLoadingFact(false);
                      setAnchorCoords(null);
                    }}
                    onSave={saveFact}
                    anchor={anchor}
                  />
                ) : null}
              </>
            )}
          />
        </div>
      )}

      {/* Modals */}
      <CreatePinModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setRetapTargetPin(null);
          setPendingLocation(null);
        }}
        lat={pendingLocation?.lat || 0}
        lng={pendingLocation?.lng || 0}
        onSave={handleSavePin}
        presetPinHash={retapTargetPin ? retapTargetPin.pinHash : undefined}
      />

      <UnlockPinModal
        isOpen={unlockModalOpen}
        onClose={() => {
          setUnlockModalOpen(false);
          setRetapModalOpen(false);
        }}
        pin={selectedPin}
        onUnlock={handleUnlock}
        onDelete={handleDeletePin}
      />

      <FileViewer
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        files={selectedPin?.files || []}
      />

      {/* Re-tap modal */}
      {retapModalOpen && retapTargetPin && (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setRetapModalOpen(false)}>
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', damping: 18 }} className="glass-card w-full max-w-md p-5 rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-gradient-primary"><MapPin className="w-6 h-6 text-white" /></div>
              <div>
                <h3 className="text-xl font-semibold">This location already holds your memories</h3>
                <p className="text-xs text-muted-foreground">What would you like to do?</p>
                <p className="text-xs text-muted-foreground mt-1">{retapTargetPin.name || 'Saved Memory'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Button size="lg" className="w-full bg-gradient-primary text-white" onClick={() => { setSelectedPin(retapTargetPin); setUnlockModalOpen(true); setRetapModalOpen(false); }}>
                <Eye className="w-5 h-5 mr-2" /> View Memory
              </Button>
              <Button size="lg" variant="secondary" className="w-full" onClick={() => { setPendingLocation({ lat: retapTargetPin.lat, lng: retapTargetPin.lng }); setCreateModalOpen(true); setRetapModalOpen(false); }}>
                <Lock className="w-5 h-5 mr-2" /> Lock a Memory
              </Button>
              {retapTargetPin.ownerUserId === getOrCreateDeviceId() && (
                <Button size="lg" variant="outline" className="w-full" onClick={() => { setShareModalOpen(true); }}>
                  <Share2 className="w-5 h-5 mr-2" /> Share My Space
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Share modal */}
      {shareModalOpen && retapTargetPin && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShareModalOpen(false)}>
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ type: 'spring', damping: 18 }} className="glass-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-2">Share your space link</h3>
            <p className="text-sm text-muted-foreground mb-4">Share your space link. Anyone with this link can view it at its location—no PIN required.</p>
            <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 mb-3">
              <div>
                <p className="text-sm font-medium">Make memory public</p>
                <p className="text-xs text-muted-foreground">Discoverable at this spot with PIN</p>
              </div>
              <Switch checked={!!retapTargetPin.isPublic} onCheckedChange={async (checked) => {
                await updatePin(retapTargetPin.id, { isPublic: checked });
                setRetapTargetPin({ ...retapTargetPin, isPublic: checked });
                await loadPins();
                toast.success(checked ? 'Memory is now public 🌐' : 'Memory set to private 🔒');
              }} />
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-muted/40">
                <p className="text-xs text-muted-foreground mb-2">Coordinates:</p>
                <p className="text-sm font-mono">{retapTargetPin.lat.toFixed(6)}, {retapTargetPin.lng.toFixed(6)}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 break-all text-sm">
                {`${location.origin}?lat=${retapTargetPin.lat.toFixed(6)}&lng=${retapTargetPin.lng.toFixed(6)}&zoom=15&pinId=${retapTargetPin.id}`}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => { 
                  const shareLink = `${location.origin}?lat=${retapTargetPin.lat.toFixed(6)}&lng=${retapTargetPin.lng.toFixed(6)}&zoom=15&pinId=${retapTargetPin.id}`;
                  navigator.clipboard.writeText(shareLink); 
                  toast.success('Link copied to clipboard! 📋'); 
                }} className="bg-gradient-primary text-white flex-1">Copy Link</Button>
                <Button variant="secondary" onClick={() => setShareModalOpen(false)}>Close</Button>
              </div>
            </div>
           </motion.div>
         </div>
       )}

       {/* Location Share Modal */}
       {locationShareModalOpen && sharedLocation && (
         <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setLocationShareModalOpen(false)}>
           <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ type: 'spring', damping: 18 }} className="glass-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
             <div className="flex items-center gap-3 mb-4">
               <div className="p-3 rounded-full bg-gradient-primary">
                 <MapIcon className="w-6 h-6 text-white" />
               </div>
               <div>
                 <h3 className="text-xl font-semibold">
                   {sharedLocation.pinId ? 'Share Pin Location' : 'Share Map Location'}
                 </h3>
                 <p className="text-sm text-muted-foreground">
                   {sharedLocation.pinId 
                     ? 'Share this pin location with your friends. They can unlock it directly!' 
                     : 'Share this exact map view with your friends'
                   }
                 </p>
               </div>
             </div>
             
             <div className="space-y-4">
               {sharedLocation.pinId && (
                 <div className="p-3 rounded-xl bg-muted/40">
                   <p className="text-xs text-muted-foreground mb-2">Pin:</p>
                   <p className="text-sm font-medium">
                     {pins.find(p => p.id === sharedLocation.pinId)?.name || 'Unknown Pin'}
                   </p>
                 </div>
               )}
               <div className="p-3 rounded-xl bg-muted/40">
                 <p className="text-xs text-muted-foreground mb-2">Coordinates:</p>
                 <p className="text-sm font-mono">{sharedLocation.lat.toFixed(6)}, {sharedLocation.lng.toFixed(6)}</p>
                 <p className="text-xs text-muted-foreground mt-1">Zoom: {sharedLocation.zoom}</p>
               </div>
               
               <div className="p-3 rounded-xl bg-muted/40 break-all text-sm">
                 {generateLocationShareLink(sharedLocation.lat, sharedLocation.lng, sharedLocation.zoom, sharedLocation.pinId)}
               </div>
               
               <div className="flex gap-2">
                 <Button 
                   onClick={() => {
                     navigator.clipboard.writeText(generateLocationShareLink(sharedLocation.lat, sharedLocation.lng, sharedLocation.zoom, sharedLocation.pinId));
                     toast.success('Location link copied to clipboard! 📋');
                   }} 
                   className="bg-gradient-primary text-white flex-1"
                 >
                   <Share2 className="w-4 h-4 mr-2" />
                   Copy Link
                 </Button>
                 <Button 
                   variant="secondary" 
                   onClick={() => setLocationShareModalOpen(false)}
                 >
                   Close
                 </Button>
               </div>
             </div>
           </motion.div>
         </div>
       )}

      {/* Fact Card is now rendered inside the map overlay via SimpleMap.overlayContent */}

      {/* Saved Facts Menu */}
      <SavedFactsMenu
        isOpen={savedFactsMenuOpen}
        onClose={() => setSavedFactsMenuOpen(false)}
        savedFacts={savedFacts}
        onSelectFact={handleSelectSavedFact}
        onDeleteFact={deleteSavedFact}
      />

      {/* YouTube Video Modal */}
      {videoModalOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setVideoModalOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="relative w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setVideoModalOpen(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>

            {/* Shorts aspect ratio 9:16 */}
            <div
              className="relative w-full rounded-2xl overflow-hidden shadow-2xl bg-black"
              style={{ paddingBottom: '177.78%' }}
            >
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/hP4BwtZD59s?autoplay=1&rel=0&modestbranding=1"
                title="Mapplock Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </motion.div>
        </div>
      )}
     
     </div>
  );
}
