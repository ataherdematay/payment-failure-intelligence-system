# PFIS Sunum Senaryosu (Teleprompter Formatı)

> **KULLANIM BİLGİSİ:** 
> Bu metin, doğrudan okuyabileceğiniz ve izleyicilerle (özellikle Craftgate gibi ödeme orkestrasyon firmalarıyla) göz teması kurarken akıcı bir şekilde anlatabilmeniz için tasarlanmıştır. `(Parantez içindeki mavi yazılar hareketi belirtir)`

---

## GİRİŞ (Ekran: Ana Dashboard Açık - Overview Sekmesi)

**"Değerli jüri üyeleri / Herkese merhaba,"**

"Ödeme sistemlerinde hız ve güvenlik ne kadar önemliyse, başarısız olan işlemleri anlamak ve bunları kurtarmak da o kadar önemlidir."

"Bugün sizlere, ödeme orkestrasyonu altyapılarının kalbine entegre edilmek üzere geliştirdiğim **Payment Failure Intelligence System (PFIS)** prototipini sunuyorum."

"Şu an ekranda gördüğünüz veriler... *(Ekrana elinizle işaret edin)* 
Bir e-ticaret veya ödeme sağlayıcısı ağından akan 10.000 işlemden oluşan sentetik ama gerçek dünya dinamiklerini yansıtan bir akış. 
Burada sadece ne kadar kazandığımıza değil, neden *kaybettiğimize* odaklanıyoruz."

"Bir oran vereyim: %30 başarısızlık. Birçok firma bu oranı sektör normu kabul edip geçer. Ancak Craftgate gibi milyarlarca liralık hacim yöneten bir orkestrasyon katmanında, bu %30'un sadece %1'ini bile teknik bir zekayla kurtarmak, on milyonlarca liranın kasada kalması demektir."

---

## BÖLÜM 1: AKILLI İÇGÖRÜLER (Ekran: Insights Sekmesine Geçin)

*(Sol menüden Insights sekmesine tıklayın)*

"Büyük veri yığınlarına bakıp sorunu bulmak zordur. Bu yüzden sistemi proaktif hale getirdim." 

"Bir operatörün saatlerini harcayarak bulacağı anomalileri, sistemimiz saniyeler içinde **'İçgörü Kartları'** (Insight Cards) olarak önümüze seriyor."

"Sistem bize şunu söylüyor: *(Ekranda CRITICAL karta odaklanın)* 
'Square altyapısında geçersiz kart hataları ciddi bir eşiği aştı.' 
Bunu fark ettiğiniz an, Craftgate'in akıllı yönlendirme algoritmasını tetikleyip trafiği anında Stripe'a veya iyzico'ya kaydırabilir, kanamayı durdurabilirsiniz. PFIS, aslında o **yönlendirme kararını aldıran zekanın kendisidir.**"

---

## BÖLÜM 2: MAKİNE ÖĞRENMESİ İLE TAHMİN (Ekran: Predictions Sekmesi)

*(Sol menüden Predictions sekmesine tıklayın)*

"Peki, başarısızlığı *olmadan önce* tahmin edebilir miyiz?
Arka planda çalışan FastAPI ve scikit-learn tabanlı RandomForest makine öğrenmesi modelimiz tam olarak bunu yapıyor."

*(Sol taraftaki forma bilgileri girin: Tutar: 250, Ülke: TR, Cihaz: Mobile, Gateway: Stripe)*

"Diyelim ki bir işlem bize ulaştı. Henüz bankadan ret yanıtı almadık. Parametreleri veriyoruz..."
*(Predict Butonuna Basın)*

"Modelimiz geçmiş verilerden öğrenerek, bu spesifik işlemin büyük ihtimalle 'Yetersiz Bakiye' veya 'Ağ Hatası' yüzünden başarısız olacağını tahmin ediyor. İşlem orkestrasyon katmanına geldiği milisaniye içinde, bu işlemi hangi pos'a, hangi retry parametresiyle yollamamız gerektiğini bu güven skorlarına bakarak belirleyebiliriz."

---

## BÖLÜM 3: SİMÜLASYON VE WHAT-IF ANALİZİ (Ekran: Simulation Sekmesi)

*(Sol menüden Simulation sekmesine geçin)*

"Bir ürün yöneticisi olarak sormanız gereken en önemli soru 'Ne Olurdu?' sorusudur."

"Şu anki başarısızlık oranımız stabil. Peki ya Kara Cuma (Black Friday) olsaydı ve altyapılara inanılmaz bir yük binseydi?"
*(Ağ Kararlılığı - Network Reliability slider'ını aşağı çekin, Fraud Sensitivity'yi artırın)*

"Bakın, ağ kararlılığı düştüğünde kaybolan cironun nasıl fırladığını canlı olarak görebiliyoruz. 
İşte Craftgate'in 'Ödeme Tekrar Deneme' (Retry) özelliği tam burada devreye giriyor."
*(Retry Logic butonunu açın (Toggle Switch))*

"Sistemde otomatik tekrar deneme algoritmasını aktif ettiğimizde, o kaybedilen cironun büyük bir kısmını tekrar ağa geri döndürüp kurtarabildiğimizi matematiksel olarak modelleyebiliyoruz. PFIS, sadece raporlamaz, simüle eder ve karar aldırır."

---

## BÖLÜM 4: SAAS VE CANLI KULLANIM (Ekran: Admin Panel Login)

*(Sol en alttan Admin ikonuna tıklayın ve Giriş yapın)*

"Son olarak, sistemi kurup bırakmıyoruz. Bu gerçek bir SaaS (Hizmet Olarak Yazılım) altyapısı."

"Diyelim ki X firması Craftgate'e katıldı ve kendi işlem geçmişini analiz etmek istiyor. 
Admin panelimiz üzerinden kendi CSV geçmişini yükleyebiliyor." 
*(Upload Demo butonunu gösterin)*

"Daha da önemlisi, 'Retrain Model' (Modeli Yeniden Eğit) yeteneği sayesinde arka plandaki makine öğrenmesi modelini, doğrudan bu yeni yüklenen firmanın kendi verisine göre anında eğitebiliyor. Yani her üye işyeri, kendi müşteri profiline özel öğrenen bir yapay zekaya sahip oluyor."

---

## KAPANIŞ 

"PFIS prototipi şu an canlıda; NextJS, NestJS ve Python mimarisiyle, %100 Test otomasyonuna sahip, CI/CD süreçlerinden geçmiş bir production ortamında çalışıyor."

"Ödemeyi tamamlamak bir tesisat sorunudur; ancak o tesisatın içindeki kaybı önlemek ve optimize etmek bir **veri zekası** sorunudur. PFIS ile bu zekayı somut, kullanılabilir bir ürüne dönüştürdük."

**"Dinlediğiniz için çok teşekkür ederim, sistemin kod mimarisi veya ML detaylarıyla ilgili sorularınız varsa yanıtlamaktan mutluluk duyarım."**
