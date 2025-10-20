import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Volume2, VolumeX, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CommentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  placeName: string;
  placeCoordinates: { lat: number; lng: number };
  topic?: string;
}

export default function CommentPanel({ 
  isOpen, 
  onClose, 
  placeName,
  placeCoordinates,
  topic
}: CommentPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const speak = (text: string) => {
    if (!voiceEnabled) return;
    
    // Cancel any ongoing speech
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Use Web Speech API for text-to-speech
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      
      // Try to use a female voice
      const voices = speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.toLowerCase().includes('zira') ||
        voice.name.toLowerCase().includes('samantha')
      );
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      
      speechSynthesis.speak(utterance);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-about-place', {
        body: { 
          message: input,
          placeName,
          coordinates: placeCoordinates,
          conversationHistory: messages,
          topic
        }
      });

      if (error) throw error;

      const aiMessage: Message = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, aiMessage]);
      speak(data.response);
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed inset-4 md:inset-auto md:right-4 md:bottom-4 md:w-96 md:h-[600px] glass-card rounded-2xl shadow-2xl border border-primary/30 z-[9999] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="text-sm font-bold">Deep Dive</h2>
                  <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                    {placeName}{topic ? ` • ${topic}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={`p-2 rounded-full transition-colors ${
                    voiceEnabled ? 'bg-primary/20 text-primary' : 'hover:bg-muted'
                  }`}
                  title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div ref={scrollRef} className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      Ask me anything about {placeName}!
                    </p>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-muted rounded-2xl px-4 py-2.5">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border/50 backdrop-blur-xl">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about this place..."
                  className="flex-1 glass-card border-white/20"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
