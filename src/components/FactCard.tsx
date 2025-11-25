import { motion } from 'framer-motion';
import { Heart, Share2, Bookmark, X, MessageSquare, Newspaper, History, Globe, GraduationCap, TrendingUp, Landmark, Plane, DollarSign, Sparkles, ChevronLeft, ChevronRight, ExternalLink, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import CommentPanel from './CommentPanel';

export interface LocationFact {
  facts: string[];
  placeName: string;
  distance: number;
  imageUrls?: string[];
  category: string;
  coordinates: { lat: number; lng: number };
  sources?: Array<{ name: string; url: string }>;
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

const CATEGORIES = [
  { name: 'Facts', icon: Sparkles },
  { name: 'News', icon: Newspaper },
  { name: 'History', icon: History },
  { name: 'Geography', icon: Globe },
  { name: 'Education', icon: GraduationCap },
  { name: 'Current Affairs', icon: TrendingUp },
  { name: 'Culture', icon: Landmark },
  { name: 'Tourism', icon: Plane },
  { name: 'Economy', icon: DollarSign },
];

export default function FactCard({ fact, isLoading, onClose, onSave, anchor }: FactCardProps) {
  const [stats, setStats] = useState({ likes: 0, shares: 0, saves: 0 });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Facts');
  const [customCategory, setCustomCategory] = useState('');
  const [currentFact, setCurrentFact] = useState<LocationFact | null>(fact);
  const [loadingCategory, setLoadingCategory] = useState(false);
  
  const getRelatedTopics = (topic: string): string[] => {
    const map: Record<string, string[]> = {
      'Facts': ['History', 'Culture', 'Geography'],
      'News': ['Current Affairs', 'Economy', 'Tourism'],
      'History': ['Culture', 'Architecture', 'Tourism'],
      'Geography': ['Climate', 'Architecture', 'Tourism'],
      'Education': ['Economy', 'Culture', 'History'],
      'Current Affairs': ['News', 'Economy', 'Culture'],
      'Culture': ['History', 'Tourism', 'Cuisine'],
      'Tourism': ['Culture', 'Landmarks', 'History'],
      'Economy': ['Startups', 'Infrastructure', 'Education']
    };
    return map[topic] || ['History', 'Culture', 'Tourism'];
  };

  useEffect(() => {
    if (fact) {
      setCurrentFact(fact);
      setSelectedCategory(fact.category || 'Facts');
    }
  }, [fact]);

  useEffect(() => {
    if (!currentFact) return;

    const fetchStats = async () => {
      const { data } = await (supabase as any)
        .from('location_stats')
        .select('*')
        .eq('lat', currentFact.coordinates.lat)
        .eq('lng', currentFact.coordinates.lng)
        .maybeSingle();

      if (data) {
        setStats({ likes: data.likes || 0, shares: data.shares || 0, saves: data.saves || 0 });
      }
    };

    fetchStats();

    const channel = (supabase as any)
      .channel(`location_stats:${currentFact.coordinates.lat}:${currentFact.coordinates.lng}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'location_stats',
          filter: `lat=eq.${currentFact.coordinates.lat}`
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
  }, [currentFact]);

  const updateStats = async (field: 'likes' | 'shares' | 'saves') => {
    if (!currentFact) return;

    const { data: existing } = await (supabase as any)
      .from('location_stats')
      .select('*')
      .eq('lat', currentFact.coordinates.lat)
      .eq('lng', currentFact.coordinates.lng)
      .maybeSingle();

    if (existing) {
      await (supabase as any)
        .from('location_stats')
        .update({ [field]: (existing[field] || 0) + 1 })
        .eq('lat', currentFact.coordinates.lat)
        .eq('lng', currentFact.coordinates.lng);
    } else {
      await (supabase as any)
        .from('location_stats')
        .insert({
          lat: currentFact.coordinates.lat,
          lng: currentFact.coordinates.lng,
          place_name: currentFact.placeName,
          [field]: 1
        });
    }
  };

  const handleShare = async () => {
    if (!currentFact) return;
    
    await updateStats('shares');
    const shareUrl = `${window.location.origin}?lat=${currentFact.coordinates.lat}&lng=${currentFact.coordinates.lng}`;
    const shareText = `${currentFact.placeName}\n\nView location: ${shareUrl}`;
    
    if (navigator.share) {
      navigator.share({
        title: currentFact.placeName,
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
    toast.success('Liked!');
  };

  const handleSave = async () => {
    if (!currentFact) return;
    
    await updateStats('saves');
    onSave(currentFact);
    toast.success('Saved!');
  };

  const handleOpenSources = () => {
    if (!currentFact?.sources || currentFact.sources.length === 0) {
      toast.error('No sources available');
      return;
    }
    
    currentFact.sources.forEach(source => {
      window.open(source.url, '_blank', 'noopener,noreferrer');
    });
    toast.success(`Opened ${currentFact.sources.length} source${currentFact.sources.length > 1 ? 's' : ''}`);
  };

  const nextImage = () => {
    if (currentFact?.imageUrls) {
      setCurrentImageIndex((prev) => (prev + 1) % currentFact.imageUrls!.length);
    }
  };

  const prevImage = () => {
    if (currentFact?.imageUrls) {
      setCurrentImageIndex((prev) => (prev - 1 + currentFact.imageUrls!.length) % currentFact.imageUrls!.length);
    }
  };

  const fetchFactForCategory = async (category: string) => {
    if (!fact) return;

    setLoadingCategory(true);
    try {
      const response = await supabase.functions.invoke('get-location-fact', {
        body: { lat: fact.coordinates.lat, lng: fact.coordinates.lng, category }
      });

      if (response.data) {
        console.log('Received fact data with sources:', response.data.sources);
        setCurrentFact(response.data);
        setCurrentImageIndex(0);
      }
    } catch (error) {
      console.error(`Error fetching ${category} info:`, error);
      toast.error(`Failed to load ${category}`);
    } finally {
      setLoadingCategory(false);
    }
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setCustomCategory('');
    fetchFactForCategory(category);
  };

  const handleCustomCategory = () => {
    if (!customCategory.trim()) return;
    setSelectedCategory('');
    fetchFactForCategory(customCategory);
  };

  if (isLoading && !anchor) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-4"
      >
        <Card className="relative shadow-2xl border-2 border-primary/30 backdrop-blur-xl bg-background/95">
          <CardContent className="p-4 space-y-3">
            <div className="h-6 w-48 bg-muted animate-pulse rounded" />
            <div className="h-32 w-full bg-muted animate-pulse rounded-lg" />
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-8 w-20 bg-muted animate-pulse rounded-full" />
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!currentFact) return null;

  // Anchored (inside a map overlay) vs fixed (global)
  const isAnchored = !!anchor;

  // Compute responsive width and scale based on zoom level
  const computedStyles: React.CSSProperties | undefined = isAnchored
    ? (() => {
        const zoom = (anchor as any).zoom as number;
        const cw = (anchor as any).containerWidth as number;
        const ch = (anchor as any).containerHeight as number;

        // Auto-adjustable card based on zoom level
        // Base width: 320px, scales smoothly with zoom
        const baseWidth = 320;
        
        // Improved zoom scaling: more responsive to zoom changes
        // At zoom 10: scale ~0.7, at zoom 15: scale ~0.95, at zoom 20: scale ~1.1
        const zoomScale = Math.max(0.6, Math.min(1.2, 0.5 + (zoom / 20)));
        
        const width = Math.min(
          Math.round(baseWidth * zoomScale), 
          Math.round(cw * 0.85)
        );

        // Keep card fully inside container
        const left = Math.min(Math.max(anchor!.x, width * 0.5 + 8), cw - width * 0.5 - 8);
        const desiredTop = anchor!.y - 16;
        const top = Math.max(16 + 8, Math.min(desiredTop, ch - 16));

        return {
          width,
          left: `${left}px`,
          top: `${top}px`,
          transform: 'translate(-50%, calc(-100%))',
          fontSize: `${Math.max(0.7, Math.min(1, zoomScale))}rem`,
        } as React.CSSProperties;
      })()
    : undefined;

  const activeTopic = selectedCategory || (customCategory.trim() ? customCategory.trim() : 'Facts');

  return (
    <motion.div
      initial={{ opacity: 0, y: isAnchored ? 10 : 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: isAnchored ? 10 : 50 }}
      className={
        isAnchored
          ? 'absolute z-[1001] px-2 pointer-events-auto'
          : 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-lg px-4'
      }
      style={isAnchored ? computedStyles : { maxWidth: 'calc(100vw - 2rem)', left: 'clamp(1rem, 50%, calc(100vw - 1rem))' }}
    >
      <Card className="relative shadow-2xl border-2 border-primary/30 backdrop-blur-xl bg-background/95 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-muted/50 transition-colors z-10 bg-background/80"
        >
          <X className="w-3 h-3" />
        </button>
        
        <CardContent className="p-0">
          {/* Header Section: images + place overlay - reduced height */}
          {currentFact.imageUrls && currentFact.imageUrls.length > 0 && (
            <div className="relative w-full h-20 overflow-hidden group">
              <img
                src={currentFact.imageUrls[currentImageIndex]}
                alt={currentFact.placeName}
                className="w-full h-full object-cover"
              />
              {/* Overlay with place name and distance */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-white">
                <h3 className="text-sm font-semibold drop-shadow">
                  {currentFact.placeName}
                </h3>
                {currentFact.distance > 0 && (
                  <p className="text-[10px] opacity-90">{Math.round(currentFact.distance)} km away</p>
                )}
              </div>
              {currentFact.imageUrls.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {currentFact.imageUrls.map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full transition-all ${
                          i === currentImageIndex ? 'bg-white w-2' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="p-3 space-y-2.5">
            {/* Header fallback if no images */}
            {!currentFact.imageUrls || currentFact.imageUrls.length === 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-foreground">{currentFact.placeName}</h3>
                {currentFact.distance > 0 && (
                  <p className="text-xs text-muted-foreground">{Math.round(currentFact.distance)} km away</p>
                )}
              </div>
            ) : null}

            {/* Category Section */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1">
                {CATEGORIES.map(({ name, icon: Icon }) => (
                  <button
                    key={name}
                    onClick={() => handleCategorySelect(name)}
                    disabled={loadingCategory}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                      selectedCategory === name
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    } ${loadingCategory ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{name}</span>
                  </button>
                ))}
              </div>
              
              {/* Custom category input */}
              <div className="flex gap-1">
                <Input
                  placeholder="Custom topic..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomCategory()}
                  disabled={loadingCategory}
                  className="h-6 text-[11px] px-2"
                />
                <Button
                  size="sm"
                  onClick={handleCustomCategory}
                  disabled={!customCategory.trim() || loadingCategory}
                  className="h-6 px-2 text-[11px]"
                >
                  Go
                </Button>
              </div>
            </div>

            {/* Content Section */}
            {loadingCategory ? (
              <div className="space-y-1.5">
                <div className="h-2.5 bg-muted animate-pulse rounded" />
                <div className="h-2.5 bg-muted animate-pulse rounded w-4/5" />
                <div className="h-2.5 bg-muted animate-pulse rounded w-3/5" />
              </div>
            ) : (
              <div className="space-y-1.5">
                {currentFact.facts.slice(0, 6).map((fact, i) => (
                  <div key={i} className="flex gap-2 text-xs leading-relaxed text-foreground">
                    <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                    <span className="flex-1">{fact}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Sources Section */}
            {!loadingCategory && currentFact.sources && currentFact.sources.length > 0 && (
              <div className="pt-1 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground mb-1">Sources:</p>
                <div className="flex flex-wrap gap-1">
                  {currentFact.sources.map((source, i) => (
                    <a
                      key={i}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      <span>{source.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Add-ons: related topics */}
            {!loadingCategory && (
              <div className="pt-0.5">
                <div className="flex flex-wrap gap-1">
                  {getRelatedTopics(activeTopic).map((topic) => (
                    <button
                      key={topic}
                      onClick={() => handleCategorySelect(topic)}
                      disabled={loadingCategory}
                      className="px-2 py-1 rounded-full text-[11px] bg-muted hover:bg-muted/80 text-muted-foreground"
                      title={`Explore ${topic}`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-1.5 border-t border-border">
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className="h-7 px-2 hover:bg-transparent hover:text-primary"
                  title="Like"
                >
                  <Heart className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  className="h-7 px-2 hover:bg-transparent hover:text-primary"
                  title="Save"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="h-7 px-2 hover:bg-transparent hover:text-primary"
                  title="Share"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </Button>
                {currentFact.sources && currentFact.sources.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenSources}
                    className="h-7 px-2 hover:bg-transparent hover:text-primary"
                    title={`Open ${currentFact.sources.length} source${currentFact.sources.length > 1 ? 's' : ''}`}
                  >
                    <Link className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(true)}
                className="h-7 px-2 text-xs hover:bg-transparent hover:text-primary"
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                Deep Dive
              </Button>
            </div>
          </div>
        </CardContent>
        
        {isAnchored && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-background" />
        )}
      </Card>

      {currentFact && (
        <CommentPanel
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          placeName={currentFact.placeName}
          placeCoordinates={currentFact.coordinates}
          topic={activeTopic}
        />
      )}
    </motion.div>
  );
}
