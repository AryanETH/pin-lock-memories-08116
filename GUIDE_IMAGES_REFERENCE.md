# Mapplock Guide Images - URL Reference

## 📱 Images Available for Android App

All images are accessible via the base URL: **https://maps.aitoyz.in/guides/**

### Image URLs for Your App Code

#### 1. Background Autostart (Redmi)
```
https://maps.aitoyz.in/guides/background-autostart-redmi.png
```
**Use in app:**
```kotlin
val imageUrl = "https://maps.aitoyz.in/guides/background-autostart-redmi.png"
// Or
const val BACKGROUND_AUTOSTART_IMAGE = "https://maps.aitoyz.in/guides/background-autostart-redmi.png"
```

#### 2. Battery Unrestricted / No Optimization (Redmi)
```
https://maps.aitoyz.in/guides/battery-unrestricted-redmi.png
```
**Use in app:**
```kotlin
val imageUrl = "https://maps.aitoyz.in/guides/battery-unrestricted-redmi.png"
// Or
const val BATTERY_UNRESTRICTED_IMAGE = "https://maps.aitoyz.in/guides/battery-unrestricted-redmi.png"
```

#### 3. Display Over Other Apps (Redmi)
```
https://maps.aitoyz.in/guides/display-over-apps-redmi.png
```
**Use in app:**
```kotlin
val imageUrl = "https://maps.aitoyz.in/guides/display-over-apps-redmi.png"
// Or
const val DISPLAY_OVER_APPS_IMAGE = "https://maps.aitoyz.in/guides/display-over-apps-redmi.png"
```

#### 4. Running in Background (Redmi)
```
https://maps.aitoyz.in/guides/running-in-background-redmi.png
```
**Use in app:**
```kotlin
val imageUrl = "https://maps.aitoyz.in/guides/running-in-background-redmi.png"
// Or
const val RUNNING_BACKGROUND_IMAGE = "https://maps.aitoyz.in/guides/running-in-background-redmi.png"
```

#### 5. Usage Access Permission (Redmi)
```
https://maps.aitoyz.in/guides/usage-access-redmi.png
```
**Use in app:**
```kotlin
val imageUrl = "https://maps.aitoyz.in/guides/usage-access-redmi.png"
// Or
const val USAGE_ACCESS_IMAGE = "https://maps.aitoyz.in/guides/usage-access-redmi.png"
```

---

## 📝 Quick Copy-Paste for Android Code

### Kotlin Constants Object
```kotlin
object GuideImages {
    private const val BASE_URL = "https://maps.aitoyz.in/guides/"
    
    const val BACKGROUND_AUTOSTART_REDMI = "${BASE_URL}background-autostart-redmi.png"
    const val BATTERY_UNRESTRICTED_REDMI = "${BASE_URL}battery-unrestricted-redmi.png"
    const val DISPLAY_OVER_APPS_REDMI = "${BASE_URL}display-over-apps-redmi.png"
    const val RUNNING_BACKGROUND_REDMI = "${BASE_URL}running-in-background-redmi.png"
    const val USAGE_ACCESS_REDMI = "${BASE_URL}usage-access-redmi.png"
}

// Usage:
Glide.with(context)
    .load(GuideImages.USAGE_ACCESS_REDMI)
    .into(imageView)
```

### Kotlin Enum Class
```kotlin
enum class PermissionGuideImage(val url: String) {
    BACKGROUND_AUTOSTART("https://maps.aitoyz.in/guides/background-autostart-redmi.png"),
    BATTERY_UNRESTRICTED("https://maps.aitoyz.in/guides/battery-unrestricted-redmi.png"),
    DISPLAY_OVER_APPS("https://maps.aitoyz.in/guides/display-over-apps-redmi.png"),
    RUNNING_BACKGROUND("https://maps.aitoyz.in/guides/running-in-background-redmi.png"),
    USAGE_ACCESS("https://maps.aitoyz.in/guides/usage-access-redmi.png");
}

// Usage:
Glide.with(context)
    .load(PermissionGuideImage.USAGE_ACCESS.url)
    .into(imageView)
```

### Jetpack Compose
```kotlin
@Composable
fun PermissionGuideImage(imageUrl: String) {
    AsyncImage(
        model = imageUrl,
        contentDescription = "Permission guide screenshot",
        modifier = Modifier.fillMaxWidth()
    )
}

// Usage:
PermissionGuideImage("https://maps.aitoyz.in/guides/usage-access-redmi.png")
```

---

## 🔧 Implementation Examples

### Using Glide (Recommended)
```kotlin
// In build.gradle
dependencies {
    implementation 'com.github.bumptech.glide:glide:4.16.0'
}

// In your Activity/Fragment
Glide.with(this)
    .load("https://maps.aitoyz.in/guides/usage-access-redmi.png")
    .placeholder(R.drawable.ic_loading)
    .error(R.drawable.ic_error)
    .into(binding.guideImageView)
```

### Using Coil (Modern Kotlin)
```kotlin
// In build.gradle
dependencies {
    implementation 'io.coil-kt:coil:2.5.0'
}

// In your Activity/Fragment
binding.guideImageView.load("https://maps.aitoyz.in/guides/usage-access-redmi.png") {
    crossfade(true)
    placeholder(R.drawable.ic_loading)
    error(R.drawable.ic_error)
}
```

### Using Picasso
```kotlin
// In build.gradle
dependencies {
    implementation 'com.squareup.picasso:picasso:2.8'
}

// In your Activity/Fragment
Picasso.get()
    .load("https://maps.aitoyz.in/guides/usage-access-redmi.png")
    .placeholder(R.drawable.ic_loading)
    .error(R.drawable.ic_error)
    .into(binding.guideImageView)
```

### Jetpack Compose + Coil
```kotlin
// In build.gradle
dependencies {
    implementation 'io.coil-kt:coil-compose:2.5.0'
}

// In your Composable
@Composable
fun GuideScreen() {
    AsyncImage(
        model = "https://maps.aitoyz.in/guides/usage-access-redmi.png",
        contentDescription = "Usage access guide",
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(9f / 16f),
        contentScale = ContentScale.Fit
    )
}
```

---

## 📋 Complete Guide Flow Example

### Step-by-Step Permission Guide
```kotlin
data class PermissionStep(
    val title: String,
    val description: String,
    val imageUrl: String
)

val redmiPermissionSteps = listOf(
    PermissionStep(
        title = "Enable Usage Access",
        description = "Allow Mapplock to detect when protected apps are opened",
        imageUrl = "https://maps.aitoyz.in/guides/usage-access-redmi.png"
    ),
    PermissionStep(
        title = "Allow Display Over Apps",
        description = "Enable Mapplock to show the lock screen over protected apps",
        imageUrl = "https://maps.aitoyz.in/guides/display-over-apps-redmi.png"
    ),
    PermissionStep(
        title = "Disable Battery Optimization",
        description = "Ensure Mapplock runs in background to protect your apps",
        imageUrl = "https://maps.aitoyz.in/guides/battery-unrestricted-redmi.png"
    ),
    PermissionStep(
        title = "Enable Background Autostart",
        description = "Allow Mapplock to start automatically after device restart",
        imageUrl = "https://maps.aitoyz.in/guides/background-autostart-redmi.png"
    ),
    PermissionStep(
        title = "Keep Running in Background",
        description = "Prevent MIUI from killing Mapplock in background",
        imageUrl = "https://maps.aitoyz.in/guides/running-in-background-redmi.png"
    )
)

// In your ViewPager or RecyclerView adapter
override fun onBindViewHolder(holder: ViewHolder, position: Int) {
    val step = redmiPermissionSteps[position]
    holder.titleText.text = step.title
    holder.descriptionText.text = step.description
    Glide.with(holder.itemView)
        .load(step.imageUrl)
        .into(holder.guideImage)
}
```

---

## 🌐 Web Implementation (Testing)

### HTML (Direct Link)
```html
<img src="https://maps.aitoyz.in/guides/usage-access-redmi.png" 
     alt="Usage Access Permission" 
     width="400">
```

### React/Next.js
```jsx
import Image from 'next/image'

export default function GuideImage() {
  return (
    <Image
      src="https://maps.aitoyz.in/guides/usage-access-redmi.png"
      alt="Usage Access Guide"
      width={400}
      height={800}
    />
  )
}
```

### Vue.js
```vue
<template>
  <img 
    :src="guideImageUrl" 
    alt="Permission Guide"
    class="guide-image"
  >
</template>

<script>
export default {
  data() {
    return {
      guideImageUrl: 'https://maps.aitoyz.in/guides/usage-access-redmi.png'
    }
  }
}
</script>
```

---

## 📱 Device-Specific Implementation

### Detect Device Brand and Show Appropriate Images
```kotlin
fun getGuideImagesForDevice(): List<String> {
    val manufacturer = Build.MANUFACTURER.lowercase()
    
    return when {
        manufacturer.contains("xiaomi") || manufacturer.contains("redmi") -> {
            listOf(
                "https://maps.aitoyz.in/guides/usage-access-redmi.png",
                "https://maps.aitoyz.in/guides/display-over-apps-redmi.png",
                "https://maps.aitoyz.in/guides/battery-unrestricted-redmi.png",
                "https://maps.aitoyz.in/guides/background-autostart-redmi.png",
                "https://maps.aitoyz.in/guides/running-in-background-redmi.png"
            )
        }
        // Add other manufacturers as needed
        manufacturer.contains("samsung") -> {
            // Add Samsung-specific guide URLs here
            listOf()
        }
        manufacturer.contains("oppo") -> {
            // Add Oppo-specific guide URLs here
            listOf()
        }
        else -> {
            // Generic Android guides
            listOf()
        }
    }
}
```

---

## 🔐 Security & Best Practices

### 1. Cache Images Locally (Recommended)
```kotlin
// Use Glide's disk cache
Glide.with(context)
    .load("https://maps.aitoyz.in/guides/usage-access-redmi.png")
    .diskCacheStrategy(DiskCacheStrategy.ALL)
    .into(imageView)
```

### 2. Handle Network Errors
```kotlin
Glide.with(context)
    .load("https://maps.aitoyz.in/guides/usage-access-redmi.png")
    .listener(object : RequestListener<Drawable> {
        override fun onLoadFailed(
            e: GlideException?,
            model: Any?,
            target: Target<Drawable>?,
            isFirstResource: Boolean
        ): Boolean {
            // Show fallback or retry
            Toast.makeText(context, "Failed to load guide image", Toast.LENGTH_SHORT).show()
            return false
        }
        
        override fun onResourceReady(
            resource: Drawable?,
            model: Any?,
            target: Target<Drawable>?,
            dataSource: DataSource?,
            isFirstResource: Boolean
        ): Boolean {
            return false
        }
    })
    .into(imageView)
```

### 3. Add Loading States
```kotlin
@Composable
fun GuideImageWithLoading(imageUrl: String) {
    var isLoading by remember { mutableStateOf(true) }
    
    Box(modifier = Modifier.fillMaxWidth()) {
        AsyncImage(
            model = imageUrl,
            contentDescription = "Guide screenshot",
            onSuccess = { isLoading = false },
            onError = { isLoading = false }
        )
        
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.align(Alignment.Center)
            )
        }
    }
}
```

---

## 📊 Analytics Tracking

### Track Image Views
```kotlin
// Using Firebase Analytics
fun trackGuideImageView(imageName: String) {
    val bundle = Bundle().apply {
        putString("image_name", imageName)
        putString("device_brand", Build.MANUFACTURER)
    }
    firebaseAnalytics.logEvent("guide_image_viewed", bundle)
}

// Usage:
Glide.with(context)
    .load(GuideImages.USAGE_ACCESS_REDMI)
    .listener(object : RequestListener<Drawable> {
        override fun onResourceReady(/*...*/): Boolean {
            trackGuideImageView("usage_access_redmi")
            return false
        }
    })
    .into(imageView)
```

---

## ✅ Verification URLs

Test these URLs in your browser:

1. https://maps.aitoyz.in/guides/background-autostart-redmi.png
2. https://maps.aitoyz.in/guides/battery-unrestricted-redmi.png
3. https://maps.aitoyz.in/guides/display-over-apps-redmi.png
4. https://maps.aitoyz.in/guides/running-in-background-redmi.png
5. https://maps.aitoyz.in/guides/usage-access-redmi.png

**After deployment, all images will be accessible via these URLs!**

---

## 📦 File Structure

```
public/
├── guides/
│   ├── background-autostart-redmi.png
│   ├── battery-unrestricted-redmi.png
│   ├── display-over-apps-redmi.png
│   ├── running-in-background-redmi.png
│   └── usage-access-redmi.png
└── screenshots/
    └── (original files with spaces)
```

---

## 🚀 Deployment Notes

When you deploy to **maps.aitoyz.in**, these images will automatically be available at:
- Base URL: `https://maps.aitoyz.in/guides/`
- Images are in `/public/guides/` folder
- Server will serve them as static files
- No additional configuration needed

---

**Ready to use in your Android app!** 📱✨
