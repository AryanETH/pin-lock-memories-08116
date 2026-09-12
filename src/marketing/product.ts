export const product = {
  name: 'Mapplock',
  fullName: 'Mapplock: App Lock & Vault',
  developer: 'AItoyz',
  playUrl: 'https://play.google.com/store/apps/details?id=com.aitoyz.mapplock',
  developerUrl: 'https://play.google.com/store/apps/dev?id=8600169858790433057',
  supportEmail: 'hello@aitoyz.in',
  description: 'Lock apps and hide private photos behind a secret place on the map. Discover Mapplock, the Android app lock and local photo vault by AItoyz.',
};

export const screenshots = [
  { file: 'weather-map', title: 'A familiar face.', detail: 'A map on the outside.', alt: 'Mapplock map with place search and weather information' },
  { file: 'dashboard', title: 'Your private space.', detail: 'Everything in one dashboard.', alt: 'Mapplock dashboard with app locking, photos and intruder captures' },
  { file: 'app-lock', title: 'A little extra protection.', detail: 'Choose the apps you lock.', alt: 'Mapplock app selection screen showing individual app locks' },
  { file: 'photo-vault', title: 'For your eyes only.', detail: 'Personal photos, kept personal.', alt: 'Private photo gallery inside Mapplock' },
  { file: 'secret-map', title: 'Hidden in plain sight.', detail: 'A secret place for your memories.', alt: 'Mapplock promotional artwork showing a map covering private memories' },
];

export const faqs = [
  ['What is Mapplock?', 'Mapplock is an Android app lock and private photo vault by AItoyz. Its private dashboard sits behind a secret place on a map, with PIN, pattern or supported fingerprint authentication.'],
  ['How does the secret map entrance work?', 'Choose a secret location in Mapplock. To open its private dashboard, return to that area on the map, double-tap within the saved radius, then authenticate. You navigate to the place on the screen; you do not need to travel there.'],
  ['Does Mapplock upload my private photos?', 'According to Mapplock’s existing privacy policy, private file contents remain on your device and are not transferred to cloud servers. Map, place-search, weather and AQI services may contact their providers. The policy also describes device and performance data and advertising services.'],
  ['Can I use it without an internet connection?', 'Core app-lock and vault features are designed to continue offline after initial setup. Uncached maps, new place searches and current weather or AQI information need an internet connection.'],
  ['What if I forget my secret place?', 'Recent Places can help you navigate back to a saved map area. You still need to authenticate; finding the place does not bypass your lock. Keep your PIN or pattern somewhere safe.'],
  ['What should I do before uninstalling?', 'Restore or export important vault files before uninstalling Mapplock or clearing its storage. Removing app data can remove local files and the keys needed to access them. Do not rely on reinstalling to recover your vault.'],
  ['Is Mapplock available for iPhone?', 'Mapplock is an Android app. Use the official Google Play listing for current device compatibility, availability and release information.'],
];

export const permissions = [
  ['Usage Access', 'Detect when a protected app is opened.'],
  ['Display over other apps', 'Show the authentication screen over the app you protect.'],
  ['Notifications', 'Show relevant app-lock and protection status updates.'],
  ['Battery and background settings', 'Help app locking continue while Mapplock runs in the background.'],
  ['Location', 'Show your current location when you use location features.'],
  ['Camera', 'Take a local intruder photo when you enable Intruder Capture and its conditions are met.'],
  ['Media and files', 'Import and restore the supported files you choose.'],
];

export interface Article { slug: string; category: string; title: string; intro: string; image?: string; sections: { title: string; text: string; steps?: string[] }[]; related: string[] }
export const articles: Article[] = [
  { slug: 'features', category: 'THE LITTLE THINGS. PROTECTED.', title: 'One app. A more private phone.', intro: 'Mapplock brings app locking and a local photo vault together behind a map-based entrance. Open a familiar-looking map, return to a place only you know, and authenticate to enter your private dashboard.', image: 'dashboard', sections: [
    { title: 'A map with a private side', text: 'Your secret map location is the entrance to your dashboard. PIN, pattern or supported fingerprint authentication adds another step before your private space opens.' },
    { title: 'Lock apps. Keep photos personal.', text: 'Select apps to protect from the app-lock screen. Import private photos into the vault and manage them from a single dashboard.' },
    { title: 'Useful on the outside, too', text: 'The map includes place search and weather information. Online utilities need an internet connection. The supplied dashboard preview labels video, audio and documents as coming soon; check Google Play for current availability.' },
  ], related: ['app-lock-for-android', 'photo-vault', 'location-based-app-lock'] },
  { slug: 'how-it-works', category: 'A PLACE. A TAP. YOUR SPACE.', title: 'Privacy starts with a place.', intro: 'Set up Mapplock by choosing a secret place on its map and an authentication method. To return, navigate to your saved area, double-tap within the saved radius, and enter your PIN, pattern or supported fingerprint.', image: 'weather-map', sections: [
    { title: 'Choose your secret place', text: 'During setup, follow the in-app map-lock instructions. Long-press a location at the required zoom level and create a PIN or pattern you can remember.', steps: ['Open Mapplock and complete the guided setup.', 'Choose a memorable place on the map.', 'Save your lock and set up authentication.'] },
    { title: 'Find it again. Make it yours.', text: 'Navigate back on the map and double-tap inside the saved radius. Authenticate to open your dashboard, then choose apps to lock or photos to protect. You do not need to physically visit the location.' },
    { title: 'Separate places, separate spaces', text: 'The supplied product brief describes up to two independent map locks, at least five kilometres apart, with an entrance radius of two kilometres. Follow the limits shown in your installed version. Recent Places helps you navigate; it never bypasses authentication.' },
  ], related: ['permissions', 'location-based-app-lock', 'data-backup'] },
  { slug: 'app-lock-for-android', category: 'APP LOCK', title: 'Your apps. Your permission.', intro: 'Mapplock adds an authentication step before selected Android apps open. Choose which apps to protect, complete the required Android permission setup, and use your PIN, pattern or supported fingerprint to access them.', image: 'app-lock', sections: [
    { title: 'Hand over your phone with more confidence', text: 'Keep selected messaging, social and gallery apps behind an extra lock. Choose what needs protection from the app list inside your dashboard.' },
    { title: 'Get protection ready', text: 'App locking relies on Android permissions and background operation. Follow Mapplock’s setup prompts, then test a protected app before relying on the lock.', steps: ['Open Lock Apps in your dashboard.', 'Select the apps you want to protect.', 'Complete the requested Usage Access and overlay setup.', 'Open a selected app and verify the authentication screen appears.'] },
    { title: 'Keep the device lock on, too', text: 'App locking adds a layer of access control. It does not replace your Android screen lock or the security of the apps themselves. Battery restrictions and manufacturer settings may affect background operation.' },
  ], related: ['permissions', 'guides/app-lock-not-working-android', 'security'] },
  { slug: 'photo-vault', category: 'PHOTO VAULT', title: 'Some memories are just for you.', intro: 'Keep personal photos in Mapplock’s local photo vault. Open your private dashboard, choose Photos and import the images you want to protect. Your secret map entrance and authentication stand between the dashboard and casual access.', image: 'photo-vault', sections: [
    { title: 'A home for your personal photos', text: 'Use the plus button in Photos to select images. Wait for the import to finish and check that they open correctly inside the vault. Check your normal gallery and any cloud photo service for copies that may still exist.' },
    { title: 'On your phone, under your control', text: 'The existing privacy policy states that private contents stay locally on your device. A local vault is not a cloud backup: device loss, app-data removal or uninstalling may result in lost files.' },
    { title: 'Before you switch phones', text: 'Restore or export the photos you want to keep before uninstalling, clearing storage or moving devices. Verify the exported files open outside the vault before removing app data.' },
  ], related: ['guides/how-to-hide-photos-on-android', 'data-backup', 'privacy'] },
  { slug: 'private-file-vault', category: 'PRIVATE FILES', title: 'Know what your vault supports.', intro: 'Mapplock’s dashboard brings private content into one place. Photos are shown in the supplied app previews. Audio, documents and video are labelled coming soon in those previews, so check your installed version and Google Play before relying on those categories.', image: 'dashboard', sections: [
    { title: 'Check availability before importing', text: 'Open your dashboard and check which categories are enabled. The brief describes custom folders, supported audio and document viewing, but current availability could not be independently confirmed.' },
    { title: 'Keep a copy of important files', text: 'Only import supported formats. Confirm a file opens successfully and keep a separate backup of anything irreplaceable. The local vault does not automatically create a recoverable cloud copy.' },
    { title: 'Deleted items and recovery', text: 'Where Recycle Bin is available, the brief describes a 30-day recovery window. Confirm the retention period in the app and restore important items promptly. Permanently removed items cannot be recovered through the bin.' },
  ], related: ['photo-vault', 'data-backup', 'updates'] },
  { slug: 'location-based-app-lock', category: 'HIDDEN IN PLAIN SIGHT', title: 'A familiar map. An unfamiliar entrance.', intro: 'Mapplock uses a place on a map as the entrance to a private dashboard. Finding that place is only part of opening it: you also authenticate with your PIN, pattern or supported fingerprint. The place is on the screen; physical travel is not required.', image: 'weather-map', sections: [
    { title: 'A different way to enter your vault', text: 'The app opens to a map. Navigate to the location you saved, double-tap within its radius and authenticate. The entrance gives your private dashboard a discreet starting point.' },
    { title: 'The location is not your whole lock', text: 'Someone finding your map location should still encounter authentication. Choose a strong PIN or pattern and keep it to yourself. Recent Places is a navigation aid, not a recovery method for forgotten credentials.' },
    { title: 'Map access and connectivity', text: 'Uncached areas and new place searches may need internet access. Set up your lock and test returning to it before relying on offline use.' },
  ], related: ['how-it-works', 'security', 'faq'] },
  { slug: 'intruder-capture', category: 'INTRUDER CAPTURE', title: 'A little more awareness.', intro: 'Intruder Capture is an optional Mapplock feature that can photograph repeated unsuccessful authentication attempts. It requires camera permission and must be enabled. Captures are intended to stay on your device in the Intruders folder.', image: 'dashboard', sections: [
    { title: 'Enable it intentionally', text: 'Review the feature in Settings, grant camera permission if you choose to use it, and follow the app’s explanation. The product brief describes capture after three repeated incorrect PIN or pattern attempts; confirm the trigger in your installed version.' },
    { title: 'Review captures locally', text: 'Open the Intruders folder from your dashboard. A capture records an unsuccessful attempt; it does not prove identity or intent. Do not use this feature to monitor other people without appropriate consent.' },
    { title: 'Understand the limits', text: 'Camera availability, permissions, Android restrictions and lighting can affect capture. This feature supplements authentication and is not a guarantee that every attempt will be photographed.' },
  ], related: ['permissions', 'privacy', 'security'] },
  { slug: 'security', category: 'PRIVACY, EXPLAINED', title: 'A private space on your own device.', intro: 'Mapplock combines a discreet map entrance, authentication and local vault storage. Understanding these layers helps you choose what to protect and how to keep a recoverable copy of important files.', sections: [
    { title: 'The entrance and the lock', text: 'A saved map location leads to an authentication screen. Use a PIN, pattern or supported fingerprint. Keep a strong Android screen lock enabled as well.' },
    { title: 'Local storage has responsibilities', text: 'The existing privacy policy states that private contents stay on the device. Export important files before clearing storage or uninstalling. A lost or damaged phone can also mean lost local data.' },
    { title: 'Clear limits, honest claims', text: 'No independent audit or verified encryption specification was supplied for this website. We do not describe Mapplock as unhackable or assign an unverified encryption strength. Online maps, search, weather, analytics and advertising may involve external services; read the existing privacy policy for details.' },
  ], related: ['privacy', 'permissions', 'data-backup'] },
  { slug: 'data-backup', category: 'KEEP WHAT MATTERS', title: 'A private vault is not a backup.', intro: 'Restore or export important Mapplock files before uninstalling, clearing app storage or changing phones. Vault contents are local, and removing app data can also remove the information needed to unlock those files.', sections: [
    { title: 'Before uninstalling or clearing storage', text: 'Give yourself time to check your files first.', steps: ['Open your private dashboard and authenticate.', 'Restore or export every important file using the options in your installed version.', 'Open the exported files outside Mapplock and confirm they are complete.', 'Save a separate copy somewhere you trust before removing app data.'] },
    { title: 'Moving to a new phone', text: 'Do not assume that Android device transfer or reinstalling Mapplock will restore your vault. Verify exports and transfers while you still have access to the original phone.' },
    { title: 'If data is already missing', text: 'Check your existing exports, device backups and any available Recycle Bin before making more changes. Contact support with your app version and what happened. Never send private files, your PIN or your secret coordinates.' },
  ], related: ['photo-vault', 'support', 'security'] },
];

const guideDefinitions = [
  ['how-to-lock-apps-on-android', 'How to lock apps on Android', 'app-lock-for-android'],
  ['how-to-hide-photos-on-android', 'How to hide photos on Android', 'photo-vault'],
  ['how-to-protect-private-files-on-android', 'How to protect private files on Android', 'private-file-vault'],
  ['how-to-lock-instagram-on-android', 'How to lock Instagram on Android', 'app-lock-for-android'],
  ['how-to-lock-whatsapp-on-android', 'How to lock WhatsApp on Android', 'app-lock-for-android'],
  ['app-lock-not-working-android', 'App lock not working? Start here.', 'permissions'],
  ['android-app-lock-permissions-explained', 'Android app-lock permissions, explained', 'permissions'],
];
export const guides = guideDefinitions.map(([slug, title, related]) => ({ slug: `guides/${slug}`, title, related }));
export const marketingPaths = ['/', ...articles.map(a => `/${a.slug}`), '/privacy', '/permissions', '/faq', '/guides', ...guides.map(g => `/${g.slug}`), '/updates', '/support'];
