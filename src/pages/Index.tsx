import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Moon, Sun, Eye, Lock, Share2, Map as MapIcon, BookOpen } from 'lucide-react';
import SimpleMap from '@/components/SimpleMap';
import mapxLogo from '@/assets/mapx-logo.png';
import CreatePinModal from '@/components/CreatePinModal';
import UnlockPinModal from '@/components/UnlockPinModal';
import FileViewer from '@/components/FileViewer';
import SearchBar from '@/components/SearchBar';
import FactCard, { LocationFact } from '@/components/FactCard';
import SavedFactsMenu from '@/components/SavedFactsMenu';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/contexts/ThemeContext';
import { Pin, savePin, getAllPins, updatePin, logAccess, getOrCreateDeviceId, deletePin } from '@/lib/db';
import { calculateDistance, getCurrentPosition } from '@/lib/geo';
import { toast } from 'sonner';
import { Map as LeafletMap } from 'leaflet';
import { supabase } from '@/integrations/supabase/client';
import Globe from '@/components/Globe';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  
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

  // Handle URL params after pins are loaded
  useEffect(() => {
    if (pins.length > 0) {
      handleUrlParams();
    }
  }, [pins]);

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
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* Saved Facts Menu Button - Only visible in fact mode */}
      {/* Saved Facts Menu toggle moved to header; removed floating button */}

      {/* Header Bar */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="absolute top-0 left-0 right-0 z-10 p-4"
      >
        <div className="px-6 py-3 flex items-center justify-center gap-6 rounded-2xl bg-background border shadow-md">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <img 
              src={mapxLogo} 
              alt="Logo" 
              className="w-8 h-8 object-contain dark:invert" 
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex-1 max-w-md"
          >
            <SearchBar onSelectLocation={handleSearchSelect} />
          </motion.div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
              title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
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
                toast.success(factMode ? 'Lock Memory Mode Activated' : 'Fact Mode Activated 📖');
              }}
              className="rounded-full"
              title={factMode ? 'Switch to Lock Memory Mode' : 'Fact Where You Tap'}
            >
              {factMode ? <Lock className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
            </Button>
            {factMode && (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setSavedFactsMenuOpen(true)}
                className="rounded-full shadow-lg bg-secondary hover:bg-secondary/90 border relative"
                title="Saved Facts"
              >
                <BookOpen className="w-5 h-5" />
                {savedFacts.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center font-bold px-1">
                    {savedFacts.length}
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.header>

      {/* Landing or Map */}
      {showLanding ? (
        <div className="absolute inset-0 pt-28 px-6 md:px-10 flex flex-col items-center gap-8">
          {/* Landing overlay UI */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 select-none">
            <img src={mapxLogo} alt="Mapx" className="w-7 h-7 object-contain drop-shadow dark:invert" />
            <span className="text-white/90 tracking-widest font-medium" style={{ textShadow: '0 0 10px rgba(79,195,247,0.5)' }}>MAPX</span>
          </div>
          <button
            onClick={() => setShowLanding(false)}
            className="absolute top-6 right-6 z-20 text-white/90 tracking-[0.2em] hover:scale-105 transition-transform select-none"
            style={{ textShadow: '0 0 16px rgba(79,195,247,0.5)' }}
          >
            DIVE IN →
          </button>
          {/* Search */}
          <div className="z-10">
            <SearchBar onSelectLocation={handleSearchSelect} />
          </div>
          {/* Globe */}
          <div className="w-full max-w-4xl aspect-square">
            <Globe className="w-full h-full" />
          </div>
          {/* Subtext */}
          <p className="text-sm text-muted-foreground">Drag to rotate. Releases resume auto-rotation. Day/night shading with subtle glow.</p>
          {/* Footer caption */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 tracking-widest text-xs select-none" style={{ textShadow: '0 0 12px rgba(255,255,255,0.25)' }}>
            ♡ FROM ARYAN PATIL
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 pt-24 pb-8 px-6 md:px-8 flex items-center justify-center">
          <SimpleMap
            pins={pins}
            onMapClick={handleMapClick}
            onPinClick={handlePinClick}
            userLocation={userLocation}
            onShareLocation={handleShareLocation}
            onMapReady={(map) => { mapRef.current = map; }}
            anchoredLatLng={currentFact ? { lat: currentFact.coordinates.lat, lng: currentFact.coordinates.lng } : anchorCoords || undefined}
            overlayContent={(anchor) => (
              (loadingFact || currentFact) ? (
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
              ) : null
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
   );
 }
