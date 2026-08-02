# Agent OS — Kapsamlı İmplementasyon Planı

Agent OS'u `d:\jarvis` workspace'inde inşa edeceğiz: dinamik AI ajan yönetimi, MCP entegrasyonları, SEO rank tracker, video agent iş akışı ve Tailscale uzak erişim yapılandırmasını içeren modüler bir AI işletim sistemi.

## Teknoloji Stack

| Katman | Teknoloji | Gerekçe |
|--------|-----------|---------|
| Frontend | **Vite + Vanilla JS** | Hızlı dev server, modüler yapı, framework bağımsız |
| Styling | **Vanilla CSS** + CSS Variables | Glassmorphism, dark mode, premium tasarım |
| Backend | **Node.js + Express** | MCP server, API gateway, agent orchestration |
| MCP SDK | `@modelcontextprotocol/sdk` | Resmi MCP protokol desteği |
| SEO API | **DataForSEO REST API** | Rank tracking, SERP analizi |
| Remote Access | **Tailscale API** | Uzak cihaz yönetimi, mobil erişim |
| Database | **SQLite (better-sqlite3)** | Hafif, sunucusuz, agent state & log depolama |
| Real-time | **WebSocket (ws)** | Agent durumu canlı güncelleme |

---

## Proposed Changes

### 1. Proje Altyapısı

Monorepo yapısı — frontend ve backend aynı repo'da, `npm workspaces` ile yönetilir.

```
d:\jarvis\
├── package.json              # Root workspace config
├── .env.example              # Ortam değişkenleri şablonu
├── README.md                 # Proje dokümantasyonu
│
├── server/                   # Backend (Express + MCP)
│   ├── package.json
│   ├── src/
│   │   ├── index.js          # Ana server entry point
│   │   ├── config.js         # Ortam değişkenleri yönetimi
│   │   ├── db/
│   │   │   ├── schema.sql    # SQLite tablo tanımları
│   │   │   └── database.js   # DB bağlantı ve sorgu yardımcıları
│   │   ├── mcp/
│   │   │   ├── server.js     # MCP Server kurulumu
│   │   │   └── tools/        # MCP tool tanımları
│   │   │       ├── hermes-apollo.js
│   │   │       ├── hermes-oracle.js
│   │   │       ├── lead-generation.js
│   │   │       ├── delegate.js
│   │   │       └── video-agent.js
│   │   ├── agents/
│   │   │   ├── manager.js    # Agent lifecycle yönetimi
│   │   │   ├── registry.js   # Agent tipi kayıt defteri
│   │   │   └── executor.js   # Görev çalıştırma motoru
│   │   ├── seo/
│   │   │   ├── tracker.js    # DataForSEO entegrasyonu
│   │   │   └── routes.js     # SEO API endpointleri
│   │   ├── tailscale/
│   │   │   ├── client.js     # Tailscale API istemcisi
│   │   │   └── routes.js     # Uzak erişim endpointleri
│   │   ├── routes/
│   │   │   ├── agents.js     # /api/agents CRUD
│   │   │   ├── tasks.js      # /api/tasks yönetimi
│   │   │   ├── dashboard.js  # /api/dashboard özet verileri
│   │   │   └── workspace.js  # /api/workspace forking & config
│   │   └── websocket.js      # Real-time agent durum yayını
│   └── data/                 # SQLite DB dosyası (gitignore)
│
├── client/                   # Frontend (Vite)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html            # Ana HTML entry
│   ├── src/
│   │   ├── main.js           # App başlatma
│   │   ├── router.js         # Client-side routing (SPA)
│   │   ├── api.js            # Backend API istemcisi
│   │   ├── websocket.js      # WebSocket bağlantı yönetimi
│   │   ├── styles/
│   │   │   ├── index.css     # Design system & tokens
│   │   │   ├── dashboard.css
│   │   │   ├── agents.css
│   │   │   ├── seo.css
│   │   │   ├── video.css
│   │   │   └── settings.css
│   │   ├── pages/
│   │   │   ├── dashboard.js      # Ana kontrol paneli
│   │   │   ├── agents.js         # Agent yönetim sayfası
│   │   │   ├── agent-detail.js   # Tekil agent detay & log
│   │   │   ├── seo-tracker.js    # SEO Rank Tracker
│   │   │   ├── video-agent.js    # Video Agent iş akışı
│   │   │   ├── workspace.js      # Workspace & forking yönetimi
│   │   │   └── settings.js       # Tailscale & genel ayarlar
│   │   └── components/
│   │       ├── sidebar.js        # Sol navigasyon
│   │       ├── header.js         # Üst bar & arama
│   │       ├── agent-card.js     # Agent özet kartı
│   │       ├── metric-card.js    # İstatistik kartları
│   │       ├── activity-feed.js  # Canlı aktivite akışı
│   │       ├── chart.js          # Basit grafik bileşeni
│   │       ├── modal.js          # Genel modal bileşeni
│   │       ├── toast.js          # Bildirim toastları
│   │       └── status-badge.js   # Durum rozeti
│   └── public/
│       └── favicon.svg
```

#### [NEW] package.json (root)
Root workspace tanımı, `npm workspaces` ile `server/` ve `client/` bağlanır. Tek komutla her iki projeyi başlatmak için `concurrently` kullanılır.

#### [NEW] .env.example
```
DATAFORSEO_LOGIN=your_login
DATAFORSEO_PASSWORD=your_password
TAILSCALE_API_KEY=your_tailscale_api_key
TAILSCALE_TAILNET=your_tailnet_name
PORT=3001
```

---

### 2. Backend — Server Bileşeni

#### [NEW] [index.js](file:///d:/jarvis/server/src/index.js)
Express server başlatma, middleware, CORS, statik dosya sunumu, WebSocket upgrade. Port 3001'de dinler.

#### [NEW] [database.js](file:///d:/jarvis/server/src/db/database.js)
SQLite bağlantı, migration runner, CRUD helper fonksiyonları.

#### [NEW] [schema.sql](file:///d:/jarvis/server/src/db/schema.sql)
Tablolar:
- `agents` — id, name, type, status, config (JSON), created_at, updated_at
- `tasks` — id, agent_id, title, description, status, priority, result (JSON), created_at, completed_at
- `task_logs` — id, task_id, level, message, timestamp
- `seo_keywords` — id, keyword, location, device, last_rank, last_checked
- `seo_history` — id, keyword_id, rank, url, timestamp
- `workspace_configs` — id, key, value, updated_at

#### [NEW] [manager.js](file:///d:/jarvis/server/src/agents/manager.js)
Agent yaşam döngüsü: create, start, pause, stop, delete. Her agent'ın in-memory state'ini yönetir, WebSocket üzerinden frontend'e durum değişikliği yayınlar.

#### [NEW] [registry.js](file:///d:/jarvis/server/src/agents/registry.js)
Agent tip tanımları:
- **Hermes Apollo** — Sesli asistan arayüzü, interaktif komut işleme
- **Hermes Oracle** — Rakip izleme, pazar analizi
- **Lead Generator** — API tabanlı müşteri adayı tespit
- **Delegate** — Alt ajan görev delegasyonu
- **Video Agent** — Video içerik üretim iş akışı (maks 10 dk)
- **SEO Tracker** — Rank takip ve raporlama
- **Custom** — Kullanıcı tanımlı özel ajanlar

#### [NEW] [executor.js](file:///d:/jarvis/server/src/agents/executor.js)
Görev kuyruğu, paralel çalıştırma, timeout yönetimi, 80/20 kuralı için "needs_review" flag mekanizması.

---

### 3. MCP Server Entegrasyonu

#### [NEW] [server.js](file:///d:/jarvis/server/src/mcp/server.js)
`@modelcontextprotocol/sdk` kullanarak MCP server oluşturma. Stateless request/response mimarisi. Her tool, Zod ile input validasyonu yapar.

#### [NEW] MCP Tool Dosyaları
Her biri kendi modülünde:
- `hermes-apollo.js` — Ses komutu alma, TTS çıktı üretme tool tanımı
- `hermes-oracle.js` — Rakip URL analizi, SERP karşılaştırma tool tanımı
- `lead-generation.js` — Domain/sektör bazlı lead bulma tool tanımı
- `delegate.js` — Görev decomposition ve alt ajan atama tool tanımı
- `video-agent.js` — Video brief alma, script oluşturma, süre validasyonu (≤10dk) tool tanımı

---

### 4. SEO Rank Tracker Modülü

#### [NEW] [tracker.js](file:///d:/jarvis/server/src/seo/tracker.js)
DataForSEO API entegrasyonu:
- Basic Auth ile kimlik doğrulama
- Asenkron task workflow: POST → Poll → GET
- Keyword ekleme/silme, toplu sorgulama
- Rank geçmişi kaydetme (SQLite)
- Webhook desteği (opsiyonel)

#### [NEW] [routes.js](file:///d:/jarvis/server/src/seo/routes.js)
REST endpointleri:
- `GET /api/seo/keywords` — Takip edilen anahtar kelimeler
- `POST /api/seo/keywords` — Yeni keyword ekleme
- `DELETE /api/seo/keywords/:id` — Keyword silme
- `POST /api/seo/check` — Manuel rank kontrolü tetikleme
- `GET /api/seo/history/:keywordId` — Rank geçmişi

---

### 5. Tailscale Uzak Erişim Modülü

#### [NEW] [client.js](file:///d:/jarvis/server/src/tailscale/client.js)
Tailscale REST API istemcisi:
- `Authorization: Bearer` ile auth
- Device listeleme, durum kontrolü
- Tailnet bilgisi sorgulama

#### [NEW] [routes.js](file:///d:/jarvis/server/src/tailscale/routes.js)
REST endpointleri:
- `GET /api/tailscale/devices` — Bağlı cihazlar
- `GET /api/tailscale/status` — Ağ durumu
- `POST /api/tailscale/serve` — Port expose komutu (guide)

---

### 6. Frontend — Client Bileşeni

Premium, dark-mode, glassmorphism tasarımlı SPA.

#### [NEW] [index.css](file:///d:/jarvis/client/src/styles/index.css)
Design system:
- **Renk paleti**: Koyu arka plan (`#0a0b14`, `#12131f`), neon vurgular (cyan `#00e5ff`, mor `#7c4dff`, turuncu `#ff6d00`)
- **Glassmorphism**: `backdrop-filter: blur()`, yarı-saydam arka planlar
- **Typography**: Google Fonts — Inter (UI), JetBrains Mono (kod/metrik)
- **Spacing & Radius**: 8px grid system
- **Animasyonlar**: `@keyframes` — fade-in, slide-up, pulse, shimmer

#### [NEW] [dashboard.js](file:///d:/jarvis/client/src/pages/dashboard.js)
Ana kontrol paneli:
- Üst kısımda 4 metrik kartı (aktif ajanlar, çalışan görevler, SEO sıralaması, uptime)
- Agent durum grid'i (canlı WebSocket güncellemesi)
- Son aktivite akışı (timeline view)
- Hızlı eylem butonları (yeni ajan, yeni görev, rank kontrolü)

#### [NEW] [agents.js](file:///d:/jarvis/client/src/pages/agents.js)
Agent yönetim sayfası:
- Agent listesi (grid/list toggle)
- Her agent için durum rozeti, tip ikonu, son aktivite
- "Yeni Ajan Oluştur" modal — tip seçimi, konfigürasyon
- Toplu işlem (başlat/durdur/sil)

#### [NEW] [agent-detail.js](file:///d:/jarvis/client/src/pages/agent-detail.js)
Tekil agent detay sayfası:
- Agent durumu ve metrikleri
- Canlı log akışı (terminal tarzı)
- Görev geçmişi tablosu
- Yapılandırma düzenleme formu
- "Needs Review" (80/20) kuyruk paneli

#### [NEW] [seo-tracker.js](file:///d:/jarvis/client/src/pages/seo-tracker.js)
SEO Rank Tracker sayfası:
- Keyword tablosu (sıralama, değişim, URL)
- Rank geçmişi grafiği (sparkline)
- Keyword ekleme formu
- Toplu kontrol butonu
- DataForSEO API durum göstergesi

#### [NEW] [video-agent.js](file:///d:/jarvis/client/src/pages/video-agent.js)
Video Agent iş akışı sayfası:
- Video brief formu (konu, süre ≤10dk, format)
- İş akışı timeline: Script → Üretim → Review → Onay
- 80/20 kuralı göstergesi (AI %80 / İnsan %20)
- Higsfield entegrasyon durumu
- Kısa form / uzun form seçim uyarısı

#### [NEW] [workspace.js](file:///d:/jarvis/client/src/pages/workspace.js)
Workspace & Forking yönetimi:
- Mevcut workspace durumu
- "Fork Conversation" akışı (yeni sistem örneği oluşturma)
- Model seçimi (Claude, Hermes, Fable 5, GPT 5.6 Soul)
- Workspace yapılandırma key-value editörü

#### [NEW] [settings.js](file:///d:/jarvis/client/src/pages/settings.js)
Ayarlar sayfası:
- Tailscale bağlantı durumu ve cihaz listesi
- API key yönetimi (DataForSEO, Tailscale)
- Sistem tercihleri (tema, bildirimler, dil)
- Güvenlik uyarıları (Tailscale erişim riskleri)

#### [NEW] Ortak Bileşenler
- `sidebar.js` — İkon tabanlı sol menü, aktif sayfa vurgusu, collapse/expand
- `header.js` — Sayfa başlığı, global arama, bildirim zili, kullanıcı avatarı
- `agent-card.js` — Glassmorphism kartı, animasyonlu durum göstergesi
- `metric-card.js` — Sayı + trend oku + mini sparkline
- `activity-feed.js` — Zaman damgalı olay listesi, tip bazlı ikon
- `chart.js` — Canvas tabanlı basit çizgi/bar grafik
- `modal.js` — Overlay, animasyonlu açılış/kapanış
- `toast.js` — Sağ alt köşe bildirim stack'i
- `status-badge.js` — Renk kodlu durum rozeti (active, idle, error, review)

---

## User Review Required

> [!IMPORTANT]
> **API Anahtarları Gerekli**: SEO Rank Tracker ve Tailscale modüllerinin tam çalışması için geçerli API anahtarları gerekecektir. Başlangıçta mock data ile çalışır, gerçek anahtarlar `.env` dosyasına eklendiğinde otomatik olarak geçiş yapar.

> [!WARNING]
> **Tailscale Güvenlik**: Raporda belirtildiği gibi, Tailscale yerel dosyalara erişim sağlar. Dashboard'da güvenlik uyarı paneli eklenecektir.

> [!IMPORTANT]
> **MCP Server**: MCP araçları (Hermes Apollo, Oracle vb.) şu aşamada simülasyon modunda çalışacaktır. Gerçek LLM entegrasyonu için ek model API anahtarları gerekir.

## Open Questions

> [!IMPORTANT]
> 1. **Veritabanı tercihi**: SQLite öneriyorum (sıfır konfigürasyon, dosya tabanlı). PostgreSQL veya MongoDB tercih eder misiniz?
> 2. **Kimlik doğrulama**: Dashboard'a basit bir login sistemi (username/password) ekleyelim mi, yoksa başlangıçta açık erişim yeterli mi?
> 3. **Dil tercihi**: Dashboard arayüzü Türkçe mi, İngilizce mi olsun?

---

## Verification Plan

### Automated Tests
```bash
# Backend API testleri
npm run test --workspace=server

# Frontend build doğrulama
npm run build --workspace=client
```

### Manual Verification
- Dashboard'u `http://localhost:5173` adresinden açarak tüm sayfaları gezme
- Agent CRUD operasyonlarını test etme
- SEO keyword ekleme ve mock rank verisi görüntüleme
- WebSocket bağlantısı ile canlı agent durum güncellemesini doğrulama
- Responsive tasarımı mobil viewport'ta kontrol etme
