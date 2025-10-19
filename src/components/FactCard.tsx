import { motion } from 'framer-motion';
import { Heart, Share2, Bookmark, X, ExternalLink, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import CommentPanel from './CommentPanel';

export interface LocationFact {
  fact: string;
  placeName: string;
  distance: number;
  imageUrls?: string[];
  coordinates: { lat: number; lng: number };
}

interface FactCardProps {
  fact: LocationFact | null;
  isLoading?: boolean;
  onClose: () => void;
  onSave: (fact: LocationFact) => void;
  // When provided, render the card anchored to these pixel coordinates
  // within a positioned container (e.g., map overlay). Coordinates are
  // expected to be relative to that container's top-left.
  anchor?:
    | null
    | {
        x: number;
        y: number;
        zoom: number;
        containerWidth: number;
        containerHeight: number;
      };
}

export default function FactCard({ fact, isLoading, onClose, onSave, anchor }: FactCardProps) {
  const [stats, setStats] = useState({ likes: 0, shares: 0, saves: 0 });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'geography'>('geography');
  const [historyFact, setHistoryFact] = useState<LocationFact | null>(null);
  const [geographyFact, setGeographyFact] = useState<LocationFact | null>(null);
  const [loadingTab, setLoadingTab] = useState<'history' | 'geography' | null>(null);

  // Preconnect to Google to speed up "Know More"
  useEffect(() => {
    const preconnects = [
      { rel: 'preconnect', href: 'https://www.google.com' },
      { rel: 'dns-prefetch', href: 'https://www.google.com' },
    ];
    const els: HTMLLinkElement[] = [];
    preconnects.forEach(({ rel, href }) => {
      const el = document.createElement('link');
      el.rel = rel;
      el.href = href;
      document.head.appendChild(el);
      els.push(el);
    });
    return () => {
      els.forEach((el) => {
        try { document.head.removeChild(el); } catch {}
      });
    };
  }, [fact?.placeName]);

  useEffect(() => {
    if (!fact) return;

    const fetchStats = async () => {
      const { data } = await (supabase as any)
        .from('location_stats')
        .select('*')
        .eq('lat', fact.coordinates.lat)
        .eq('lng', fact.coordinates.lng)
        .maybeSingle();

      if (data) {
        setStats({ likes: data.likes || 0, shares: data.shares || 0, saves: data.saves || 0 });
      }
    };

    fetchStats();

    // Subscribe to realtime updates
    const channel = (supabase as any)
      .channel(`location_stats:${fact.coordinates.lat}:${fact.coordinates.lng}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'location_stats',
          filter: `lat=eq.${fact.coordinates.lat}`
        },
        (payload: any) => {
          if (payload.new) {
            setStats({ 
              likes: payload.new.likes, 
              shares: payload.new.shares, 
              saves: payload.new.saves 
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fact]);

  const updateStats = async (field: 'likes' | 'shares' | 'saves') => {
    if (!fact) return;

    const { data: existing } = await (supabase as any)
      .from('location_stats')
      .select('*')
      .eq('lat', fact.coordinates.lat)
      .eq('lng', fact.coordinates.lng)
      .maybeSingle();

    if (existing) {
      await (supabase as any)
        .from('location_stats')
        .update({ [field]: (existing[field] || 0) + 1 })
        .eq('lat', fact.coordinates.lat)
        .eq('lng', fact.coordinates.lng);
    } else {
      await (supabase as any)
        .from('location_stats')
        .insert({
          lat: fact.coordinates.lat,
          lng: fact.coordinates.lng,
          place_name: fact.placeName,
          [field]: 1
        });
    }
  };

  const handleShare = async () => {
    if (!fact) return;
    
    await updateStats('shares');
    const shareUrl = `${window.location.origin}?lat=${fact.coordinates.lat}&lng=${fact.coordinates.lng}`;
    const shareText = `${fact.placeName}: ${fact.fact}\n\nView location: ${shareUrl}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Fact about ${fact.placeName}`,
        text: shareText,
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Location link copied to clipboard!');
    }
  };

  const handleLike = async () => {
    await updateStats('likes');
    toast.success('Thanks for liking this fact! ❤️');
  };

  const handleSave = async () => {
    if (!fact) return;
    
    await updateStats('saves');
    onSave(fact);
    toast.success('Fact saved! 🔖');
  };

  const handleKnowMore = () => {
    if (!currentFact) return;
    const query = encodeURIComponent(currentFact.placeName);
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
  };

  const nextImage = () => {
    if (fact?.imageUrls) {
      setCurrentImageIndex((prev) => (prev + 1) % fact.imageUrls!.length);
    }
  };

  const prevImage = () => {
    if (fact?.imageUrls) {
      setCurrentImageIndex((prev) => (prev - 1 + fact.imageUrls!.length) % fact.imageUrls!.length);
    }
  };

  // Fetch fact for a specific mode
  const fetchFactForMode = async (mode: 'history' | 'geography', coords: { lat: number; lng: number }) => {
    if (mode === 'history' && historyFact) return;
    if (mode === 'geography' && geographyFact) return;

    setLoadingTab(mode);
    try {
      const response = await supabase.functions.invoke('get-location-fact', {
        body: { lat: coords.lat, lng: coords.lng, mode }
      });

      if (response.data) {
        if (mode === 'history') {
          setHistoryFact(response.data);
        } else {
          setGeographyFact(response.data);
        }
      }
    } catch (error) {
      console.error(`Error fetching ${mode} fact:`, error);
      toast.error(`Failed to load ${mode} fact`);
    } finally {
      setLoadingTab(null);
    }
  };

  // Initialize with the first fact received
  useEffect(() => {
    if (fact && !geographyFact) {
      setGeographyFact(fact);
    }
  }, [fact]);

  // Fetch the other mode's fact when tab is switched
  const handleTabChange = (value: string) => {
    const newTab = value as 'history' | 'geography';
    setActiveTab(newTab);
    
    if (fact) {
      fetchFactForMode(newTab, fact.coordinates);
    }
  };

  const currentFact = activeTab === 'history' ? historyFact : geographyFact;

  if (isLoading && !anchor) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-4"
      >
        <Card className="relative shadow-2xl border-2 border-primary/30 backdrop-blur-xl bg-background/95 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-[slide-in-right_1.5s_ease-in-out_infinite]" />
          <CardContent className="p-6 space-y-4 relative">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/20 animate-pulse" />
              <div className="h-6 w-48 bg-primary/20 rounded animate-pulse" />
            </div>
            <div className="h-40 w-full bg-primary/10 rounded-lg animate-pulse relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-[slide-in-right_1.5s_ease-in-out_infinite]" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-primary/20 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-primary/20 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!fact) return null;

  // Anchored (inside a map overlay) vs fixed (global)
  const isAnchored = !!anchor;

  // Compute responsive width based on zoom and container size.
  // Keeps the card smaller and positioned near the click point
  const computedStyles: React.CSSProperties | undefined = isAnchored
    ? (() => {
        const zoom = (anchor as any).zoom as number;
        const cw = (anchor as any).containerWidth as number;
        const ch = (anchor as any).containerHeight as number;

        // Make card smaller - reduced base width
        const baseWidth = 320; // Reduced from 420
        const scale = Math.max(0.6, Math.min(1, zoom / 14));
        const width = Math.min(Math.round(baseWidth * scale), Math.round(cw * 0.85));

        // Keep card fully inside container using translate clamping
        const left = Math.min(Math.max(anchor!.x, width * 0.5 + 8), cw - width * 0.5 - 8);
        // Vertical placement above the anchor with margin; clamp to top
        const desiredTop = anchor!.y - 16;
        const top = Math.max(16 + 8, Math.min(desiredTop, ch - 16));

        return {
          width,
          left: `${left}px`,
          top: `${top}px`,
          transform: 'translate(-50%, calc(-100%))',
        } as React.CSSProperties;
      })()
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: isAnchored ? 10 : 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: isAnchored ? 10 : 50 }}
      className={
        isAnchored
          ? 'absolute z-[1001] px-2 pointer-events-auto'
          : 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-4'
      }
      style={isAnchored ? computedStyles : { maxWidth: 'calc(100vw - 2rem)', left: 'clamp(1rem, 50%, calc(100vw - 1rem))' }}
    >
      <Card className="relative shadow-2xl border-2 border-primary/30 backdrop-blur-xl bg-background/95">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-muted/50 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>
        
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="w-full grid grid-cols-2 rounded-t-lg rounded-b-none border-b bg-background">
              <TabsTrigger value="history" className="text-lg font-bold">History</TabsTrigger>
              <TabsTrigger value="geography" className="text-lg font-bold">Geography</TabsTrigger>
            </TabsList>

            <TabsContent value="geography" className="m-0">
              {loadingTab === 'geography' ? (
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-20 bg-muted animate-pulse rounded" />
                </div>
              ) : currentFact ? (
                <>
                  {/* Decorative Landscape Illustration */}
                  <div className="w-full h-40 relative overflow-hidden">
                    <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                      {/* Sky gradient */}
                      <defs>
                        <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#87CEEB', stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: '#B0E0E6', stopOpacity: 1 }} />
                        </linearGradient>
                      </defs>
                      <rect x="0" y="0" width="800" height="400" fill="url(#skyGradient)" />
                      
                      {/* Clouds */}
                      <ellipse cx="150" cy="100" rx="60" ry="30" fill="white" opacity="0.9" />
                      <ellipse cx="120" cy="110" rx="50" ry="25" fill="white" opacity="0.9" />
                      <ellipse cx="180" cy="110" rx="50" ry="25" fill="white" opacity="0.9" />
                      
                      <ellipse cx="450" cy="80" rx="80" ry="35" fill="white" opacity="0.9" />
                      <ellipse cx="410" cy="95" rx="60" ry="28" fill="white" opacity="0.9" />
                      <ellipse cx="490" cy="95" rx="60" ry="28" fill="white" opacity="0.9" />
                      
                      <ellipse cx="700" cy="120" rx="50" ry="25" fill="white" opacity="0.9" />
                      <ellipse cx="680" cy="130" rx="40" ry="20" fill="white" opacity="0.9" />
                      <ellipse cx="720" cy="130" rx="40" ry="20" fill="white" opacity="0.9" />
                      
                      {/* Hills - back layer (lighter) */}
                      <path d="M 0 300 Q 200 200 400 280 T 800 300 L 800 400 L 0 400 Z" fill="#9ACD32" opacity="0.6" />
                      
                      {/* Hills - middle layer */}
                      <path d="M 0 320 Q 150 240 300 300 Q 450 360 600 300 Q 700 260 800 320 L 800 400 L 0 400 Z" fill="#8FBC3F" />
                      
                      {/* Hills - front layer (darker) */}
                      <path d="M 0 350 Q 100 280 250 340 Q 400 400 550 340 Q 650 300 800 360 L 800 400 L 0 400 Z" fill="#6B8E23" />
                    </svg>
                  </div>
                  
                  <div className="px-6 pb-6 pt-4 space-y-4">
                    <div>
                      <p className="text-base text-foreground leading-relaxed">
                        <span className="font-bold text-lg">Place : </span>
                        <span className="text-lg">{currentFact.placeName}</span>
                      </p>
                    </div>
                    
                    <div>
                      <p className="font-bold text-lg text-foreground mb-2">Fact:</p>
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        {currentFact.fact}
                      </p>
                    </div>

                    <button
                      onClick={handleKnowMore}
                      className="w-full text-center text-base font-semibold text-foreground py-3 border-t-2 border-foreground hover:bg-muted/50 transition-colors"
                    >
                      Know more
                    </button>
                  </div>
                </>
              ) : null}
            </TabsContent>

            <TabsContent value="history" className="m-0">
              {loadingTab === 'history' ? (
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-20 bg-muted animate-pulse rounded" />
                </div>
              ) : currentFact ? (
                <>
                  {/* Decorative Landscape Illustration */}
                  <div className="w-full h-40 relative overflow-hidden">
                    <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                      {/* Sky gradient */}
                      <defs>
                        <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#87CEEB', stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: '#B0E0E6', stopOpacity: 1 }} />
                        </linearGradient>
                      </defs>
                      <rect x="0" y="0" width="800" height="400" fill="url(#skyGradient)" />
                      
                      {/* Clouds */}
                      <ellipse cx="150" cy="100" rx="60" ry="30" fill="white" opacity="0.9" />
                      <ellipse cx="120" cy="110" rx="50" ry="25" fill="white" opacity="0.9" />
                      <ellipse cx="180" cy="110" rx="50" ry="25" fill="white" opacity="0.9" />
                      
                      <ellipse cx="450" cy="80" rx="80" ry="35" fill="white" opacity="0.9" />
                      <ellipse cx="410" cy="95" rx="60" ry="28" fill="white" opacity="0.9" />
                      <ellipse cx="490" cy="95" rx="60" ry="28" fill="white" opacity="0.9" />
                      
                      <ellipse cx="700" cy="120" rx="50" ry="25" fill="white" opacity="0.9" />
                      <ellipse cx="680" cy="130" rx="40" ry="20" fill="white" opacity="0.9" />
                      <ellipse cx="720" cy="130" rx="40" ry="20" fill="white" opacity="0.9" />
                      
                      {/* Hills - back layer (lighter) */}
                      <path d="M 0 300 Q 200 200 400 280 T 800 300 L 800 400 L 0 400 Z" fill="#9ACD32" opacity="0.6" />
                      
                      {/* Hills - middle layer */}
                      <path d="M 0 320 Q 150 240 300 300 Q 450 360 600 300 Q 700 260 800 320 L 800 400 L 0 400 Z" fill="#8FBC3F" />
                      
                      {/* Hills - front layer (darker) */}
                      <path d="M 0 350 Q 100 280 250 340 Q 400 400 550 340 Q 650 300 800 360 L 800 400 L 0 400 Z" fill="#6B8E23" />
                    </svg>
                  </div>
                  
                  <div className="px-6 pb-6 pt-4 space-y-4">
                    <div>
                      <p className="text-base text-foreground leading-relaxed">
                        <span className="font-bold text-lg">Place : </span>
                        <span className="text-lg">{currentFact.placeName}</span>
                      </p>
                    </div>
                    
                    <div>
                      <p className="font-bold text-lg text-foreground mb-2">Fact:</p>
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        {currentFact.fact}
                      </p>
                    </div>

                    <button
                      onClick={handleKnowMore}
                      className="w-full text-center text-base font-semibold text-foreground py-3 border-t-2 border-foreground hover:bg-muted/50 transition-colors"
                    >
                      Know more
                    </button>
                  </div>
                </>
              ) : null}
            </TabsContent>
          </Tabs>
        </CardContent>
        
        {/* Pointing arrow toward the anchor (only for anchored variant) */}
        {isAnchored && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[12px] border-b-white dark:border-b-black" />
        )}
      </Card>

      {fact && (
        <CommentPanel
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          placeName={fact.placeName}
          placeCoordinates={fact.coordinates}
        />
      )}
    </motion.div>
  );
}
