# Video Optimization Guide for Mapplock Landing Page

## Current Implementation ✅

Your landing page now uses:
- **Canvas rendering** instead of direct video element
- **GSAP ScrollTrigger** for smooth scroll tracking
- **requestAnimationFrame** for 60fps rendering
- **Lerping** for smooth video scrubbing (no jank)
- **Mobile detection** with optimized lerp factors
- **Lazy seeking** - only updates when difference > 0.05s

## Performance Improvements Made

1. **Canvas Rendering**: GPU-accelerated, smoother than `<video>` element
2. **RAF Loop**: Decoupled from scroll events (no lag)
3. **Lerping**: Smooth transitions between frames
4. **GSAP ScrollTrigger**: Professional-grade scroll handling with `scrub: 0.5`
5. **Mobile Optimization**: Slower lerp on mobile (0.08 vs 0.15)

## Further Optimization (Recommended)

### Option 1: Compress Current Video (Quick Fix)

Install ffmpeg: https://ffmpeg.org/download.html

Then run:

```bash
# Reduce to 1080p and compress
ffmpeg -i "public/earth-zoom.mp4" \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease" \
  -c:v libx264 \
  -crf 28 \
  -preset slow \
  -movflags +faststart \
  -c:a copy \
  "public/earth-zoom-optimized.mp4"

# For mobile (720p)
ffmpeg -i "public/earth-zoom.mp4" \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease" \
  -c:v libx264 \
  -crf 30 \
  -preset slow \
  -movflags +faststart \
  -c:a copy \
  "public/earth-zoom-mobile.mp4"
```

Expected results:
- 20MB → 3-6MB (1080p)
- 20MB → 1-2MB (720p)

### Option 2: Extract Image Sequence (Best Performance)

This is what Apple uses. Extract 120 frames as WebP:

```bash
# Extract 120 frames
ffmpeg -i "public/earth-zoom.mp4" \
  -vf "fps=120/$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of default=noprint_wrappers=1:nokey=1 public/earth-zoom.mp4),scale=1920:1080" \
  -q:v 70 \
  "public/frames/frame-%04d.webp"
```

Then update the code to load frames instead of video.

### Option 3: Use WebM Format

Better compression than MP4:

```bash
ffmpeg -i "public/earth-zoom.mp4" \
  -c:v libvpx-vp9 \
  -crf 35 \
  -b:v 0 \
  -vf "scale=1920:1080" \
  "public/earth-zoom.webm"
```

## Current File Sizes

Check your current video size:
```bash
ls -lh public/earth-zoom.mp4
```

## Testing Performance

1. Open Chrome DevTools
2. Go to Performance tab
3. Record while scrolling
4. Look for:
   - Frame drops (should be 60fps)
   - Long tasks (should be < 50ms)
   - GPU usage

## Mobile Testing

Test on actual devices:
- iPhone 12 or newer
- Samsung Galaxy S21 or newer
- Mid-range Android (Pixel 6a)

## Recommended Next Steps

1. **Immediate**: Use the current optimized implementation (already done ✅)
2. **Short-term**: Compress video to 1080p using ffmpeg
3. **Long-term**: Convert to image sequence for Apple-level smoothness

## Implementation Status

✅ Canvas rendering
✅ GSAP ScrollTrigger
✅ RAF loop with lerping
✅ Mobile detection
✅ Smooth scrubbing
⏳ Video compression (manual step)
⏳ Image sequence (optional upgrade)

## Questions?

The current implementation should work smoothly on most devices. If you still experience lag:
1. Compress the video to 1080p
2. Test on target devices
3. Consider image sequence for premium experience
