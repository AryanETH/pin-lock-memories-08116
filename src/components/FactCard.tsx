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
import { GlowEffect } from '@/components/ui/glow-effect';

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
    if (!fact) return;
    const query = encodeURIComponent(`More information about ${fact.placeName}`);
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
            <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
              <TabsTrigger value="geography">Geography</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
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
                  {currentFact.imageUrls && currentFact.imageUrls.length > 0 && (
                    <div className="relative w-full aspect-video overflow-hidden group">
                      <img
                        src={currentFact.imageUrls[currentImageIndex]}
                        alt={currentFact.placeName}
                        className="w-full h-full object-cover"
                      />
                      <GlowEffect
                        colors={['#0894FF', '#C959DD', '#FF2E54', '#FF9004']}
                        mode="rotate"
                        blur="medium"
                        duration={8}
                      />
                      {currentFact.imageUrls.length > 1 && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{currentFact.placeName}</h3>
                      {currentFact.distance > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.round(currentFact.distance)} km away
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {currentFact.fact}
                    </p>

                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(currentFact.placeName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm text-primary hover:underline mt-2"
                    >
                      More info →
                    </a>
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
                  {currentFact.imageUrls && currentFact.imageUrls.length > 0 && (
                    <div className="relative w-full aspect-video overflow-hidden group">
                      <img
                        src={currentFact.imageUrls[currentImageIndex]}
                        alt={currentFact.placeName}
                        className="w-full h-full object-cover"
                      />
                      <GlowEffect
                        colors={['#0894FF', '#C959DD', '#FF2E54', '#FF9004']}
                        mode="rotate"
                        blur="medium"
                        duration={8}
                      />
                      {currentFact.imageUrls.length > 1 && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{currentFact.placeName}</h3>
                      {currentFact.distance > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.round(currentFact.distance)} km away
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {currentFact.fact}
                    </p>

                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(currentFact.placeName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm text-primary hover:underline mt-2"
                    >
                      More info →
                    </a>
                  </div>
                </>
              ) : null}
            </TabsContent>
          </Tabs>
            
            <div className="flex items-center justify-between px-4 pb-3 pt-2 border-t border-border">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className="p-0 h-auto hover:bg-transparent"
                >
                  <Heart className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="p-0 h-auto hover:bg-transparent"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  className="p-0 h-auto hover:bg-transparent"
                >
                  <Bookmark className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(true)}
                className="flex items-center gap-1.5 text-xs px-2 h-auto py-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat with AI</span>
              </Button>
            </div>
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
