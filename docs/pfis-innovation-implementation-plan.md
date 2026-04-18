# PFIS Yenilik Yol Haritası ve Uygulama Planı

> Bu doküman, PFIS için önerilen 5 kritik yeniliğin (Action Center, Canlı Anomali Alarmı, Explainability, Multi-Tenant İzolasyonu, Retrain Job Queue) uçtan uca, adım adım ve uygulanabilir planlamasını içerir.
> Amaç: Demo etkisini yükseltmek, ürün olgunluğunu artırmak ve teknik borç oluşturmadan sürdürülebilir bir mimariye geçmek.

---

## 1) Planın Stratejik Çerçevesi

### 1.1 Hedef
PFIS’i “gösteren dashboard” seviyesinden “aksiyon aldıran karar platformu” seviyesine taşımak.

### 1.2 Başarı Tanımı
Aşağıdaki 3 çıktıyı aynı anda sağlayan sürüm başarılı kabul edilir:
1. **Operasyonel hız:** Insight’ı gördükten sonra aksiyon alana kadar geçen süre belirgin şekilde azalır.
2. **Güven ve açıklanabilirlik:** ML çıktıları neden-sonuç ilişkisiyle okunabilir olur.
3. **SaaS olgunluğu:** Firma bazlı veri izolasyonu ve uzun süren işlemler için üretim dostu altyapı devreye girer.

### 1.3 Varsayımlar
- Mevcut stack korunacak: `Next.js` + `NestJS` + `FastAPI` + `PostgreSQL`.
- Kısa vadede mevcut deployment altyapısı (Vercel/Railway) değişmeyecek.
- Yeni özellikler geriye dönük uyumluluğu bozmayacak.

### 1.4 Önceliklendirme Mantığı
Öncelik sırası, aşağıdaki formülle belirlenmiştir:

$$
Öncelik\,Skoru = \frac{(İş\,Etkisi + Demo\,Etkisi + Teknik\,Temel\,Katkısı)}{Efor + Risk}
$$

Bu nedenle önerilen uygulama sırası:
1. Action Center
2. Canlı Anomali Alarmı
3. Model Explainability
4. Retrain Job Queue
5. Tenant/Firma İzolasyonu

> Not: Teknik olarak Multi-Tenant temeli daha erken de atılabilir; ancak demo etkisi ve görünür değer açısından yukarıdaki sıra daha verimli.

---

## 2) Faz Planı (Roadmap)

## Faz 0 — Hazırlık (1–2 gün)

### Amaç
Uygulama sırasında karışıklık yaşamamak için ortak sözleşmeleri netleştirmek.

### Çıktılar
- API naming ve response format standardı
- Event isim standardı (alert/action/retrain)
- Feature flag planı
- Ölçüm metrikleri listesi

### Görevler
1. Backend response formatını tek kalıpta dokümante et.
2. Frontend tarafında API client tiplerini bu kalıba hizala.
3. Yeni özellikler için env değişkenlerini belirle.
4. Demo modunda kullanılacak örnek event datasetini hazırla.

---

## Faz 1 — Action Center (3–4 gün)

## 3) Yenilik #1: Action Center (Insight → Aksiyon)

### 3.1 Problem
Mevcut sistem insight üretiyor; fakat kullanıcı ayrı ekranlara gidip manuel aksiyon almak zorunda kalıyor.

### 3.2 Hedef
Insight kartından doğrudan operasyonel aksiyon başlatmak.

### 3.3 Ürün Kapsamı
Insight kartlarında aşağıdaki aksiyonlar gösterilecek:
- `Enable Retry Policy`
- `Reduce Gateway Weight`
- `Create Alert Rule`
- `Mark as Investigating` / `Mark as Resolved`

### 3.4 Teknik Tasarım
#### Backend
- Yeni modül: `backend/src/actions/`
- Entity: `action_log` (kim, ne zaman, hangi insight, hangi payload)
- Endpoint’ler:
  - `POST /api/v1/actions/execute`
  - `GET /api/v1/actions/history`
  - `PATCH /api/v1/actions/:id/status`

#### Frontend
- `insights` ekranında her kart için aksiyon menüsü
- Optimistic UI + hata durumunda rollback
- “Son alınan aksiyonlar” mini timeline

### 3.5 Veri Sözleşmesi (Örnek)
`POST /actions/execute` request:
- `insightId: string`
- `actionType: 'enable_retry' | 'reduce_gateway_weight' | 'create_alert'`
- `parameters: Record<string, unknown>`
- `actor: string`

Response:
- `actionId`
- `status: 'queued' | 'applied' | 'failed'`
- `appliedAt`

### 3.6 İş Paketleri
1. `actions` module/controller/service oluştur.
2. Action log tablosunu ekle (migration).
3. Insights kartlarına “Aksiyon Al” UI butonları ekle.
4. Action history panelini ekle.
5. Unit + e2e testlerini yaz.

### 3.7 Kabul Kriterleri
- Kullanıcı insight kartından 2 tık içinde aksiyon başlatabiliyor.
- Başarılı/başarısız aksiyonlar history’de izlenebiliyor.
- Yetkisiz kullanıcı aksiyon endpoint’lerine erişemiyor.

### 3.8 Riskler ve Önlem
- **Risk:** Yanlış aksiyon tetiklenmesi.
- **Önlem:** Onay modalı + kritik aksiyonlar için “double confirm”.

---

## Faz 2 — Canlı Anomali Alarmı (2–3 gün)

## 4) Yenilik #2: Canlı Anomali Alarmı (Real-time Alerting)

### 4.1 Problem
Anomaliler ancak kullanıcı sayfayı yenileyince fark ediliyor.

### 4.2 Hedef
Kural tabanlı alarm motoru ile anomalileri anlık göstermek.

### 4.3 Ürün Kapsamı
- Alert severities: `INFO`, `WARNING`, `CRITICAL`
- Dashboard üst bar’da canlı bildirim rozeti
- Alert timeline sayfası
- Sessize alma (`mute`) ve kural bazlı kapatma

### 4.4 Teknik Tasarım
#### Backend
- Yeni servis: `alert-engine.service.ts`
- Kural örnekleri:
  - Gateway failure rate 10 dakikada %X artarsa
  - `network_error` oranı threshold’u aşarsa
  - Ülke bazlı ani sapma olursa
- Basit polling tabanlı MVP (30–60 sn)

#### Frontend
- Header’da alert counter
- `alerts` drawer/panel
- Severity renk kodları + zaman damgası

### 4.5 İş Paketleri
1. Alert entity + repository katmanı.
2. Rule evaluation job (cron/polling).
3. Alert API endpoint’leri:
   - `GET /api/v1/alerts`
   - `PATCH /api/v1/alerts/:id/ack`
   - `PATCH /api/v1/alerts/:id/mute`
4. Frontend canlı listeleme ve badge entegrasyonu.
5. Demo için sentetik alert seed.

### 4.6 Kabul Kriterleri
- Kritik bir sapma üretildiğinde 1 dakika içinde UI’da görünür.
- Kullanıcı alert’i acknowledge/mute edebilir.
- Aynı olay için tekrar eden spam alert üretimi engellenir (deduplication).

### 4.7 Riskler ve Önlem
- **Risk:** Alert yorgunluğu (çok bildirim).
- **Önlem:** Cooldown süresi + dedupe anahtarı + severity threshold.

---

## Faz 3 — ML Explainability (2 gün)

## 5) Yenilik #3: Model Açıklanabilirliği (Why this prediction?)

### 5.1 Problem
Tahmin var ama “neden o çıktı?” sorusuna net cevap yok.

### 5.2 Hedef
Prediction ekranında, sonucu etkileyen ana faktörleri kullanıcıya göstermek.

### 5.3 Ürün Kapsamı
- “Top 3 etkileyen feature” kartı
- Basit katkı yönü gösterimi: `↑ risk`, `↓ risk`
- Confidence ile birlikte okunabilir anlatım

### 5.4 Teknik Tasarım
MVP yaklaşımı (hızlı ve güvenli):
- RandomForest için SHAP yerine önce `feature contribution proxy` yaklaşımı (global importance + input distance) kullanılabilir.
- Sonraki iterasyonda SHAP eklenir.

ML servis response’a eklenecek alanlar:
- `explanations: [{ feature, impact, direction, note }]`
- `model_notes: string[]`

### 5.5 İş Paketleri
1. `ml-service/app/model.py` içinde explainability hesaplayıcı ekle.
2. `schemas.py` predict response modelini genişlet.
3. Frontend `predictions` ekranında explanation paneli ekle.
4. API ve model testlerini güncelle.

### 5.6 Kabul Kriterleri
- Her prediction response’unda açıklama alanı dolu gelir.
- UI açıklamaları kullanıcı dilinde okunabilir şekilde gösterir.
- Açıklama üretimi inference süresini kritik düzeyde artırmaz.

### 5.7 Riskler ve Önlem
- **Risk:** Açıklama ile model davranışı çelişirse güven kaybı.
- **Önlem:** MVP’de “heuristic explanation” etiketi + doğrulama testleri.

---

## Faz 4 — Retrain Job Queue (3 gün)

## 6) Yenilik #4: Retrain’i Asenkron Job Queue’ya Alma

### 6.1 Problem
Model eğitimi uzun sürüyor; senkron çağrı timeout/UX sorunu yaratıyor.

### 6.2 Hedef
Retrain sürecini kuyruğa alıp izlenebilir hale getirmek.

### 6.3 Ürün Kapsamı
- Admin panelde “training job başladı” geri bildirimi
- Job status: `queued`, `running`, `completed`, `failed`
- İlerleme barı ve son job sonuç ekranı

### 6.4 Teknik Tasarım
MVP seçenekleri:
1. **Hızlı seçenek:** DB tabanlı basit queue + worker loop
2. **Orta ölçek:** Redis + BullMQ/Celery (ileride)

Öneri: Bu sprintte DB queue MVP, sonraki sprintte Redis’e geçiş.

Backend/ML API:
- `POST /model/retrain` → jobId döner
- `GET /model/retrain/jobs/:id` → status/metrics
- `GET /model/retrain/jobs` → son N job

### 6.5 İş Paketleri
1. `training_jobs` tablosu oluştur.
2. Retrain endpoint’ini async job create modeline çevir.
3. Worker process ekle (poll queue + run training + persist result).
4. Admin panelde job listesi ve progress UI.
5. Başarısız job retry stratejisi.

### 6.6 Kabul Kriterleri
- Retrain endpoint’i 1–2 saniye içinde jobId döndürür.
- Kullanıcı job durumunu panelden canlı izler.
- Başarısız job reason/log görülebilir.

### 6.7 Riskler ve Önlem
- **Risk:** Worker çökmesiyle job kaybı.
- **Önlem:** Durable status + resume/retry politikası.

---

## Faz 5 — Multi-Tenant İzolasyonu (4–6 gün)

## 7) Yenilik #5: Firma/Tenant Bazlı Veri İzolasyonu

### 7.1 Problem
Mevcut yapı tek tenant gibi çalışıyor; SaaS seviyesinde veri izolasyonu net değil.

### 7.2 Hedef
Her şirketin verisini ve model lifecycle’ını güvenli şekilde ayırmak.

### 7.3 Ürün Kapsamı
- Tenant oluşturma ve tenant admin rolü
- Transaction, insight, alert, action verilerinin tenant-scope çalışması
- Kullanıcı token’ında `tenantId` claim

### 7.4 Teknik Tasarım
#### Veri Katmanı
- İlgili tablolara `tenant_id` kolonları
- Sorgularda zorunlu tenant filtreleme
- İleride row-level security opsiyonu

#### Auth Katmanı
- Login sonrası token’a tenant claim
- Guard/interceptor ile tenant context inject

#### Uygulama Katmanı
- Tüm servislerde tenant-aware repository çağrıları
- Cross-tenant erişim testleri

### 7.5 İş Paketleri
1. Tenant entity + migration.
2. Kullanıcı/oturum modeline tenant bağla.
3. Transactions/analytics/insights/actions/alerts sorgularını tenant-scope yap.
4. Admin panelde tenant switch (sadece super admin).
5. Güvenlik testleri.

### 7.6 Kabul Kriterleri
- Tenant A kullanıcısı Tenant B verisini hiçbir endpoint’te göremez.
- Tüm kritik endpoint’ler tenant claim zorunlu kontrol eder.
- Cross-tenant erişim denemeleri 403 döner.

### 7.7 Riskler ve Önlem
- **Risk:** Unutulan bir query’de veri sızıntısı.
- **Önlem:** Tenant-aware base repository + zorunlu linter/test pattern.

---

## 8) Teknik İş Kırılım Ağacı (WBS)

### 8.1 Backend
- Modüller: `actions`, `alerts`, `tenants`
- Entity/Migration: `action_log`, `alerts`, `training_jobs`, `tenants`, tenant_id genişletmeleri
- Auth genişletme: JWT claim + tenant guard
- API standardizasyonu

### 8.2 Frontend
- Insight action menu
- Alerts badge + timeline panel
- Prediction explainability panel
- Admin retrain jobs ekranı
- Tenant selector (super admin)

### 8.3 ML Service
- Explainability response enrich
- Async retrain status endpoint’leri
- Model metadata alanları

### 8.4 QA/Test
- Backend unit/e2e senaryoları
- ML API + model test güncellemeleri
- Frontend component/integration test altyapısı ve temel testler

---

## 9) Test Stratejisi (Yenilik Bazlı)

### 9.1 Action Center
- Unit: action validation, state transitions
- E2E: insight → action execute → history görünürlüğü

### 9.2 Alerting
- Unit: rule evaluator, dedupe, cooldown
- Integration: alert generation cycle

### 9.3 Explainability
- Model test: explanation alanı boş dönmüyor
- API test: schema uyumu
- UI test: top features render

### 9.4 Retrain Queue
- Integration: job lifecycle
- Failure test: eğitim hatasında `failed` state + message

### 9.5 Multi-Tenant
- Security e2e: cross-tenant erişim testleri
- Negative tests: missing tenant claim

---

## 10) Ölçüm ve KPI Seti

Bu yeniliklerin başarı etkisi aşağıdaki metriklerle ölçülür:

### Ürün KPI’ları
- Insight-to-action süresi (dakika)
- Acknowledge edilen alert oranı
- Explainability panel görüntülenme oranı
- Retrain başarılı job oranı

### Teknik KPI’lar
- Retrain endpoint yanıt süresi (ilk response)
- Alert üretim gecikmesi
- Prediction P95 latency
- Tenant erişim ihlali sayısı (0 hedef)

### Demo KPI’ları
- Tek senaryoda gösterilen canlı aksiyon sayısı
- Demo sırasında görünür “saved revenue” etkisi

---

## 11) Risk Matrisi ve Yönetimi

| Risk | Olasılık | Etki | Önlem |
|---|---:|---:|---|
| Yanlış/erken aksiyon tetikleme | Orta | Yüksek | Confirm modal + role check |
| Alert spam | Yüksek | Orta | Dedupe + cooldown |
| Explainability yanlış yorum | Orta | Orta | Açık etiketleme + doğrulama |
| Retrain job kaybı | Düşük-Orta | Yüksek | Durable queue status + retry |
| Tenant veri sızıntısı | Düşük | Çok Yüksek | Tenant guard + e2e güvenlik testleri |

---

## 12) Dosya Bazlı Önerilen Etki Alanı

### Backend (önerilen)
- `backend/src/actions/*` (yeni)
- `backend/src/alerts/*` (yeni)
- `backend/src/tenants/*` (yeni)
- `backend/src/auth/*` (tenant claim genişletmesi)
- `backend/src/insights/*` (action trigger metadata)
- `backend/src/ml/*` (async retrain proxy uyumu)

### Frontend (önerilen)
- `frontend/app/(dashboard)/insights/*` (action menu)
- `frontend/app/(dashboard)/predictions/*` (explainability panel)
- `frontend/app/admin/*` (retrain jobs, tenant yönetimi)
- `frontend/components/*` (alert badge, timeline, action drawer)
- `frontend/lib/api.ts` (yeni endpoint tipleri)

### ML Service (önerilen)
- `ml-service/app/model.py` (explanations)
- `ml-service/app/schemas.py` (response extension)
- `ml-service/app/main.py` (async retrain endpoints)

---

## 13) Uygulama Takvimi (Önerilen)

### Sprint 1 (5 iş günü)
- Action Center
- Alerting MVP
- Dokümantasyon/API hizalama

### Sprint 2 (5 iş günü)
- Explainability panel
- Retrain Job Queue MVP
- Admin job monitor UI

### Sprint 3 (5–7 iş günü)
- Multi-Tenant izolasyonu
- Güvenlik testleri
- Demo polish + performans iyileştirmeleri

---

## 14) Demo Akışıyla Entegre Sunum Planı

Sunum sırasında bu yeniliklerin etkisini göstermek için önerilen sıra:
1. Insight kartında kritik sorunu göster
2. Action Center ile tek tık aksiyon al
3. Alert timeline’da etkisini canlı gör
4. Prediction’da “neden bu tahmin” panelini aç
5. Admin’den retrain job başlatıp progress göster
6. Tenant switch ile firma bazlı izolasyonu kanıtla

Bu akış, “sadece dashboard” algısını kırıp “karar ve operasyon platformu” algısı oluşturur.

---

## 15) Hemen Başlanacak Backlog (İlk 10 İş)

1. Action log entity + migration oluştur.
2. `POST /actions/execute` endpoint’ini yaz.
3. Insight kartına aksiyon dropdown ekle.
4. Alert entity + dedupe key yapısı ekle.
5. Alert poller/cron job MVP yaz.
6. Header alert badge component’i ekle.
7. ML predict response’a `explanations` alanı ekle.
8. Predictions sayfasına explainability panel ekle.
9. Retrain endpoint’ini `jobId` dönen async modele geçir.
10. Admin panelde retrain job status listesi ekle.

---

## 16) Tamamlanma Kriteri (Definition of Done)

Bir yenilik, aşağıdaki kriterlerin tamamı sağlandığında “tamamlandı” kabul edilir:
- Kod tamamlandı ve code review’dan geçti
- Unit/integration/e2e testleri eklendi ve geçti
- Dokümantasyon güncellendi
- Demo senaryosuna entegre edildi
- Gözlemlenebilir metrik en az 1 KPI’da iyileşme gösterdi

---

## 17) Sonuç

Bu planla PFIS;
- raporlayan bir panelden,
- aksiyon üreten,
- canlı izleyen,
- neden-sonuç açıklayan,
- SaaS izolasyonu güçlü,
- operasyonel olarak ölçeklenebilir

bir platforma evrilir.

En kritik kazanım: **“Insight gördüm” noktasından “Aksiyonu aldım ve etkisini ölçtüm” noktasına geçiş süresi dramatik biçimde kısalır.**
