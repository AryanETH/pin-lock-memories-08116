# How to Control Earth Zoom End Point

## 🎯 Quick Answer

To make the Earth zoom end at the same time as the scroll ends, you need to adjust the **zoom range** in the ScrollGlobe component.

---

## 📍 Location

**File:** `src/components/ScrollGlobe.tsx`  
**Line:** ~180-185

---

## 🔧 Current Code

```typescript
// Smooth zoom from far (20) to close (3.5)
const startZ = 20;
const endZ = 3.5;
```

---

## 🎮 How to Adjust

### Understanding the Values

- **`startZ`** = Camera distance when page loads (far away)
  - Higher number = Further away
  - Lower number = Closer
  - Current: `20`

- **`endZ`** = Camera distance at end of scroll (zoomed in)
  - Higher number = Less zoomed in
  - Lower number = More zoomed in
  - Current: `3.5`

### Examples

#### 1. **Zoom In More** (Get closer to Earth)
```typescript
const startZ = 20;
const endZ = 2.5;  // Changed from 3.5 to 2.5 (closer)
```

#### 2. **Zoom In Less** (Stay further from Earth)
```typescript
const startZ = 20;
const endZ = 5;  // Changed from 3.5 to 5 (further)
```

#### 3. **Start Further Away**
```typescript
const startZ = 30;  // Changed from 20 to 30
const endZ = 3.5;
```

#### 4. **Dramatic Zoom** (Start very far, end very close)
```typescript
const startZ = 50;
const endZ = 2;
```

---

## 🎬 Zoom Timing

The zoom is controlled by scroll progress (0 to 1):
- `0` = Top of page (startZ distance)
- `0.5` = Middle of scroll
- `1` = Bottom of page (endZ distance)

### Current Scroll Height
The landing page has `height: '200vh'` which means:
- 100vh = First screen height
- 200vh = Total scroll height (2x screen height)

---

## 🔄 Easing Function

The zoom uses an easing function for smooth acceleration:

```typescript
const easeProgress = scrollProgress < 0.5 
  ? 2 * scrollProgress * scrollProgress 
  : 1 - Math.pow(-2 * scrollProgress + 2, 2) / 2;
```

This creates an **ease-in-out** effect:
- Starts slow
- Speeds up in middle
- Slows down at end

### To Change Easing

#### Linear (constant speed):
```typescript
const easeProgress = scrollProgress;
```

#### Ease-in (slow start, fast end):
```typescript
const easeProgress = scrollProgress * scrollProgress;
```

#### Ease-out (fast start, slow end):
```typescript
const easeProgress = 1 - Math.pow(1 - scrollProgress, 2);
```

---

## 📏 Recommended Values

### For Different Effects

| Effect | startZ | endZ | Description |
|--------|--------|------|-------------|
| **Subtle** | 15 | 5 | Gentle zoom |
| **Current** | 20 | 3.5 | Balanced |
| **Dramatic** | 30 | 2 | Strong zoom |
| **Extreme** | 50 | 1.5 | Very close |
| **Minimal** | 10 | 6 | Slight zoom |

---

## 🎯 Perfect Sync with Scroll

To make zoom end exactly when scroll ends:

1. **Adjust scroll height** in `Index.tsx` (line ~598):
```tsx
<div ref={scrollContainerRef} className="relative w-full bg-black" 
     style={{ height: '200vh', overflow: 'visible' }}>
```

2. **Adjust zoom values** in `ScrollGlobe.tsx`:
```typescript
const startZ = 20;
const endZ = 3.5;
```

3. **Test and tweak** until it feels right!

---

## 🧪 Testing Tips

1. **Start with small changes** (±0.5 units)
2. **Test on different screen sizes** (mobile, tablet, desktop)
3. **Check at different scroll positions**:
   - 0% (top)
   - 25% (quarter)
   - 50% (middle)
   - 75% (three-quarters)
   - 100% (bottom)

---

## 🎨 Visual Guide

```
Scroll Progress:  0%        25%       50%       75%      100%
                  |---------|---------|---------|---------|
Camera Distance:  20        15        10        6         3.5
Earth Size:       Small     Medium    Large     Larger    Largest
```

---

## 💡 Pro Tips

1. **Mobile vs Desktop**: Consider different values for mobile
```typescript
const isMobile = window.innerWidth < 768;
const startZ = isMobile ? 25 : 20;
const endZ = isMobile ? 4 : 3.5;
```

2. **Smooth Transition**: Keep the difference between startZ and endZ reasonable (10-20 units)

3. **Earth Size**: If you change Earth size, adjust zoom accordingly:
   - Larger Earth → Increase endZ (stay further)
   - Smaller Earth → Decrease endZ (get closer)

---

## 📝 Current Settings Summary

### Play Store Logo (UPDATED ✅)
- **Mobile**: 80px × 80px
- **Small**: 96px × 96px  
- **Tablet**: 256px × 256px (doubled!)
- **Desktop**: 320px × 320px (doubled!)
- **Spacing**: Reduced from `gap-3 md:gap-4 lg:gap-6` to `gap-2 md:gap-3`

### Earth Zoom
- **Start Distance**: 20 units
- **End Distance**: 3.5 units
- **Zoom Range**: 16.5 units
- **Easing**: Ease-in-out

---

## 🚀 Quick Changes

Want to try different settings? Here are copy-paste ready options:

### Option 1: Closer Zoom
```typescript
const startZ = 20;
const endZ = 2.5;
```

### Option 2: Dramatic Zoom
```typescript
const startZ = 30;
const endZ = 2;
```

### Option 3: Gentle Zoom
```typescript
const startZ = 15;
const endZ = 5;
```

Just replace the values in `ScrollGlobe.tsx` around line 180!
