# 🚀 SnapChef — Play Store Yükləmə Qaydası

## 📁 Fayl Strukturu (Netlify-ə yüklə)
```
/
├── index.html          ← Ana tətbiq
├── manifest.json       ← PWA manifest
├── sw.js               ← Service Worker (offline)
├── offline.html        ← Offline səhifə
├── netlify.toml        ← Netlify config
├── privacy-policy.html ← Privacy Policy
├── .well-known/
│   └── assetlinks.json ← TWA verification (sonra yenilə)
└── icons/
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    ├── icon-512.png
    ├── icon-maskable-192.png
    ├── icon-maskable-512.png
    ├── favicon-32.png
    └── apple-touch-icon.png
```

## ✅ Addım 1: Netlify-ə Deploy
1. Bütün faylları GitHub repo-ya push et
2. Netlify avtomatik deploy edəcək
3. Test: `https://sənin-sayt.netlify.app/manifest.json` açılmalıdır
4. Test: `https://sənin-sayt.netlify.app/sw.js` açılmalıdır

## ✅ Addım 2: PWA Test
1. Chrome → saytını aç → F12 → Application tab
2. "Manifest" bölməsində xətalar olmamalıdır
3. "Service Workers" bölməsində SW registered olmalıdır
4. Lighthouse → "Installable" checkmark olmalıdır

## ✅ Addım 3: TWA Build (APK/AAB yaratmaq)

### Variant A: PWABuilder (ən sadə ✨)
1. **https://www.pwabuilder.com/** saytına get
2. Saytının URL-ni daxil et: `https://bucolic-rabanadas-a3f5cd.netlify.app`
3. "Package for stores" düyməsinə bas
4. "Android" seç
5. Parametrləri doldur:
   - **Package Name:** `com.snapchef.app`
   - **App Name:** `SnapChef`
   - **App Version:** `1.0.0`
   - **Version Code:** `1`
   - **Host:** `bucolic-rabanadas-a3f5cd.netlify.app`
   - **Start URL:** `/`
   - **Theme Color:** `#6C5CE7`
   - **Background Color:** `#0A0A0C`
   - **Navigation Color:** `#0A0A0C`
   - **Signing Key:** "Create new" seç (yeni key yaradacaq)
6. "Generate" bas → `.aab` faylı yüklənəcək
7. **SIGNING KEY-i mütləq saxla!** (itirmə, Play Store üçün lazım olacaq)

### Variant B: Bubblewrap CLI
```bash
npm install -g @nickvdh/nickvdh-nickvdh @nickvdh/nickvdh-nickvdh
npx @nickvdh/nickvdh init --manifest https://sənin-sayt.netlify.app/manifest.json
npx @nickvdh/nickvdh build
```

## ✅ Addım 4: Digital Asset Links (TWA Verification)
PWABuilder-dən `.aab` yaradanda, o sənə **SHA-256 fingerprint** verəcək.

1. `/.well-known/assetlinks.json` faylını yenilə:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.snapchef.app",
    "sha256_cert_fingerprints": ["SƏNİN_SHA256_BURADA"]
  }
}]
```
2. Netlify-ə push et
3. Test: https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://sənin-sayt.netlify.app&relation=delegate_permission/common.handle_all_urls

## ✅ Addım 5: Google Play Console
1. **https://play.google.com/console** → hesab aç ($25 birdəfəlik)
2. "Create app" bas:
   - **App name:** SnapChef
   - **Default language:** English (US)
   - **App or game:** App
   - **Free or paid:** Free
3. **Store Listing** doldur:
   - **Short description:** "Scan ingredients, get instant AI recipes & meal plans"
   - **Full description:** (aşağıda)
   - **App icon:** icon-512.png yüklə
   - **Feature graphic:** 1024x500px banner (lazım yaradım)
   - **Screenshots:** Minimum 2 (telefon screenshot-ları)
4. **Content Rating** doldurmaq → IARC questionnaire
5. **Privacy Policy:** `https://sənin-sayt.netlify.app/privacy-policy.html`
6. **App Release:**
   - Production → "Create new release"
   - `.aab` faylını yüklə
   - Release notes: "Initial release"
7. **Submit for Review** 🎉

## 📝 Store Description (hazır)

### Short Description (80 char)
Scan ingredients, get instant AI recipes & smart meal plans

### Full Description
SnapChef is your AI-powered kitchen assistant that transforms the way you cook!

🍳 SMART RECIPE GENERATION
Simply type your ingredients or snap a photo — our AI instantly creates delicious, personalized recipes with step-by-step instructions, nutritional info, and cooking tips.

🔍 FOOD ANALYSIS
Take a photo of any dish to get instant calorie counts, macro breakdown, and healthier alternatives.

📅 MEAL PLANNING
Plan your entire week with AI-generated meal plans tailored to your goals — weight loss, muscle gain, or budget-friendly cooking.

💚 HEALTH TRACKING
Track daily calories, protein, carbs, and fat. Set health goals and monitor your water intake with our built-in tracker.

🛒 SMART SHOPPING LIST
Automatically generate shopping lists from your recipes and meal plans. Never forget an ingredient again!

🎬 VIDEO RECIPE IMPORT
Paste any YouTube, TikTok, or Instagram cooking video link and get a full written recipe instantly.

🌙 BEAUTIFUL DARK MODE
Easy on the eyes with a gorgeous dark theme for late-night cooking sessions.

🌐 MULTILINGUAL
Available in English, Azerbaijani, and Russian.

Features:
✅ AI recipe generation from ingredients
✅ Camera ingredient scanning
✅ Food photo analysis & calories
✅ 7-day AI meal planning
✅ Health & nutrition tracking
✅ Water intake tracker
✅ Smart shopping lists
✅ Recipe favorites & history
✅ Social sharing
✅ Video recipe import
✅ Dietary filters (Halal, Vegan, Keto, etc.)
✅ Allergy alerts
✅ Dark mode
✅ 3 languages

Download SnapChef and start cooking smarter today! 🚀

## ⏱️ Timeline
- Review adətən **3-7 gün** çəkir
- İlk dəfə olarsa, **14 günə** qədər ola bilər
- Reject olsa, səbəbi göstərilir, düzəldib yenidən submit

## ❗ Vacib Qeydlər
- Google Play Developer hesabı **$25** (birdəfəlik)
- Signing key **İTİRMƏ** — yeniləmə üçün eyni key lazımdır
- assetlinks.json **mütləq** düzgün olmalıdır (URL bar görünməsin)
- Privacy Policy **mütləq** lazımdır
- Minimum Android 7.0 (API 24) hədəflə
