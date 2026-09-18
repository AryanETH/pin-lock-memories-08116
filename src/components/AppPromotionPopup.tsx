import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { product } from '@/marketing/product';

export function AppPromotionPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user already dismissed the popup in this session
    const dismissed = sessionStorage.getItem('mapplock-popup-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Show popup after 7 seconds
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 7000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('mapplock-popup-dismissed', 'true');
  };

  const handleDownload = () => {
    window.open(product.playUrl, '_blank');
    handleClose();
  };

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Popup Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md"
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 relative">
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close popup"
              >
                <X size={24} />
              </button>

              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                  <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 shadow-lg">
                    <svg 
                      width="64" 
                      height="64" 
                      viewBox="0 0 64 64" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Map Pin Icon */}
                      <path 
                        d="M32 8C23.163 8 16 15.163 16 24c0 13.5 16 32 16 32s16-18.5 16-32c0-8.837-7.163-16-16-16z" 
                        fill="white" 
                        opacity="0.9"
                      />
                      <circle cx="32" cy="24" r="6" fill="white" />
                      {/* Lock Icon */}
                      <path 
                        d="M36 26h-1v-2a3 3 0 00-6 0v2h-1a1 1 0 00-1 1v4a1 1 0 001 1h8a1 1 0 001-1v-4a1 1 0 00-1-1z" 
                        fill="#1E3A8A"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Get Mapplock App
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Lock apps and hide photos behind a secret place.
                  <br />
                  Available now on Android.
                </p>
              </div>

              {/* Download Button */}
              <button
                onClick={handleDownload}
                className="w-full bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors rounded-xl py-4 flex items-center justify-center gap-3 group"
              >
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none"
                  className="text-white dark:text-black"
                >
                  <path 
                    d="M3 20.5v-3.5c0-1.45 1.05-2.7 2.5-2.95L12 13l6.5 1.05c1.45.25 2.5 1.5 2.5 2.95v3.5H3zm9-11.5L7.5 4.5 9 3l3 3 3-3 1.5 1.5L12 9z" 
                    fill="currentColor"
                  />
                </svg>
                <div className="text-left">
                  <div className="text-[10px] text-white/70 dark:text-black/70 uppercase tracking-wider">
                    GET IT ON
                  </div>
                  <div className="text-white dark:text-black font-semibold text-lg leading-none">
                    Google Play
                  </div>
                </div>
              </button>

              {/* Dismiss Text */}
              <button
                onClick={handleClose}
                className="w-full mt-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
