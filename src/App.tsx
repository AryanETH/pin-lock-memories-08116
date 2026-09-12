import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { lazy, Suspense } from "react";
import Marketing from "./marketing/Marketing";
import { marketingPaths } from "./marketing/product";
const Index = lazy(() => import("./pages/Index"));
const SharedMemory = lazy(() => import("./pages/SharedMemory"));
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Landing Page - Marketing/Info Page */}
            <Route path="/" element={<Marketing path="/" />} />
            
            {/* Additional Marketing Pages */}
            {marketingPaths.filter(path => path !== '/').map(path => <Route key={path} path={path} element={<Marketing path={path} />} />)}
            
            {/* Map View (Direct Access) */}
            <Route path="/map" element={<Suspense fallback={<p>Loading your map…</p>}><Index /></Suspense>} />
            
            {/* Shared Memory View */}
            <Route path="/memory/:token" element={<Suspense fallback={<p>Loading shared memory…</p>}><SharedMemory /></Suspense>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
