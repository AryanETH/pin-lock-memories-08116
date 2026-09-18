# 📱 Mapplock Guide Images - Quick Start

## ✅ All Images Ready!

Your Redmi permission guide images are now accessible at:

### 🔗 Direct URLs (Copy & Paste These)

```
https://maps.aitoyz.in/guides/usage-access-redmi.png
https://maps.aitoyz.in/guides/display-over-apps-redmi.png
https://maps.aitoyz.in/guides/battery-unrestricted-redmi.png
https://maps.aitoyz.in/guides/background-autostart-redmi.png
https://maps.aitoyz.in/guides/running-in-background-redmi.png
```

---

## 🚀 Quick Implementation (Android)

### Option 1: Simple Kotlin Constants
```kotlin
// Add to your project
object GuideUrls {
    private const val BASE = "https://maps.aitoyz.in/guides/"
    
    const val USAGE_ACCESS = "${BASE}usage-access-redmi.png"
    const val DISPLAY_OVER_APPS = "${BASE}display-over-apps-redmi.png"
    const val BATTERY_UNRESTRICTED = "${BASE}battery-unrestricted-redmi.png"
    const val BACKGROUND_AUTOSTART = "${BASE}background-autostart-redmi.png"
    const val RUNNING_BACKGROUND = "${BASE}running-in-background-redmi.png"
}

// Use in your code
Glide.with(this).load(GuideUrls.USAGE_ACCESS).into(imageView)
```

### Option 2: Jetpack Compose
```kotlin
@Composable
fun GuideImage(url: String) {
    AsyncImage(
        model = url,
        contentDescription = "Permission guide",
        modifier = Modifier.fillMaxWidth()
    )
}

// Usage
GuideImage("https://maps.aitoyz.in/guides/usage-access-redmi.png")
```

---

## 📋 Image Details

| Image | URL | Description |
|-------|-----|-------------|
| Usage Access | `usage-access-redmi.png` | Enable usage access permission |
| Display Over Apps | `display-over-apps-redmi.png` | Allow overlay permission |
| Battery Unrestricted | `battery-unrestricted-redmi.png` | Disable battery optimization |
| Background Autostart | `background-autostart-redmi.png` | Enable autostart permission |
| Running Background | `running-in-background-redmi.png` | Keep app running in background |

---

## 🗂️ File Structure
```
public/
└── guides/
    ├── usage-access-redmi.png              ✅
    ├── display-over-apps-redmi.png         ✅
    ├── battery-unrestricted-redmi.png      ✅
    ├── background-autostart-redmi.png      ✅
    └── running-in-background-redmi.png     ✅
```

---

## ✨ After Deployment

Once you deploy to **maps.aitoyz.in**, test URLs in browser:
1. https://maps.aitoyz.in/guides/usage-access-redmi.png
2. https://maps.aitoyz.in/guides/display-over-apps-redmi.png
3. https://maps.aitoyz.in/guides/battery-unrestricted-redmi.png
4. https://maps.aitoyz.in/guides/background-autostart-redmi.png
5. https://maps.aitoyz.in/guides/running-in-background-redmi.png

**All images will load automatically!** 🎉

---

**See GUIDE_IMAGES_REFERENCE.md for complete Android implementation examples.**
