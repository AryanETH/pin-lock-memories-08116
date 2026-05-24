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
  const [isLoading, setIsLoading] = useState(true);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Preload critical assets
  useEffect(() => {
    const preloadAssets = async () => {
      const imagesToPreload = [
        '/google play.png',
        '/removed_background (12).png',
        'https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg'
      ];

      const imagePromises = imagesToPreload.map((src) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve; // Continue even if image fails
          img.src = src;
        });
      });

      // Preload Three.js scripts
      const scriptPromises = [
        'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
        'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'
      ].map((src) => {
        return new Promise((resolve) => {
          const existing = document.querySelector(`script[src="${src}"]`);
          if (existing) {
            resolve(true);
            return;
          }
          const script = document.createElement('script');
          script.src = src;
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.head.appendChild(script);
        });
      });

      try {
        await Promise.all([...imagePromises, ...scriptPromises]);
        setAssetsLoaded(true);
        // Small delay to ensure smooth transition
        setTimeout(() => setIsLoading(false), 500);
      } catch (error) {
        console.error('Error preloading assets:', error);
        setAssetsLoaded(true);
        setIsLoading(false);
      }
    };

    preloadAssets();
  }, []);
 
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
    getUserLocation();
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
    <>
      {/* Loading Screen */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-6"
          >
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/removed_background (12).png" 
                alt="Mapplock Logo" 
                className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-2xl"
              />
              <span className="text-4xl md:text-5xl font-bold text-white drop-shadow-2xl">
                Mapplock
              </span>
            </div>
            
            {/* Loading spinner */}
            <div className="relative w-16 h-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-4 border-white/20 border-t-white rounded-full"
              />
            </div>
            
            <p className="text-white/60 text-sm md:text-base">Loading experience...</p>
          </motion.div>
        </motion.div>
      )}

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
                src="/removed_background (12).png" 
                alt="Mapplock Logo" 
                className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-2xl"
              />
              <span className="text-2xl md:text-3xl font-bold text-white drop-shadow-2xl">
                Mapplock
              </span>
            </motion.div>

            {/* Join Beta Waitlist at top right */}
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
                    window.open('https://forms.gle/uZv5JwMBpkGsXjPUA', '_blank');
                  }}
                  className="relative bg-white hover:bg-gray-100 text-black font-bold px-4 md:px-6 py-2 md:py-2.5 text-xs md:text-sm rounded-full shadow-2xl transition-all duration-300 hover:scale-105 border-2 border-white animate-border-pulse"
                  style={{
                    animation: 'borderPulse 2s ease-in-out infinite'
                  }}
                >
                  Join Beta Waitlist
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
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="pointer-events-auto px-4"
              >
                <div className="text-center flex flex-col items-center space-y-1 md:space-y-2">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-tight px-2 text-center"
                    style={{
                      textShadow: '0 4px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)'
                    }}
                  >
                    World's first geo-lock
                    <br />
                    <span className="text-white">
                      Lock geologically
                    </span>
                  </motion.h1>
                  
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/90 text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl max-w-2xl mx-auto px-4 text-center"
                    style={{
                      textShadow: '0 2px 10px rgba(0,0,0,0.8)'
                    }}
                  >
                    Lock & secure your apps, photos, and files to real-world locations
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col items-center gap-2 md:gap-3 mt-3 md:mt-4"
                  >
                    <img 
                      src="/google play.png" 
                      alt="Google Play" 
                      className="w-20 h-20 sm:w-24 sm:h-24 md:w-64 md:h-64 lg:w-80 lg:h-80 object-contain drop-shadow-2xl"
                    />
                    <span className="text-white/80 text-base sm:text-lg md:text-2xl lg:text-3xl font-semibold tracking-wider">
                      COMING SOON
                    </span>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-white/60 text-xs sm:text-sm md:text-base px-4 text-center"
                    style={{
                      textShadow: '0 2px 8px rgba(0,0,0,0.8)'
                    }}
                  >
                    Limited spots available • Early access coming soon
                  </motion.p>
                </div>
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
     
     </div>
    </>
  );
}
