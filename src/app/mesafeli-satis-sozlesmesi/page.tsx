export default function DistanceSalesContractPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold">MESAFELİ SATIŞ SÖZLEŞMESİ</h1>
          <p className="text-foreground/60">
            İşbu sözleşme, ALICI (Tüketici)’nin, mobil cihazlardaki uygulama veya internet
            ortamı üzerinden, SATICI’ya ait www.ravorcollection.com adlı internet sitesi
            (“İNTERNET SİTESİ”) üzerinden sipariş vererek satın almak istediği aşağıda
            belirtilen ürün/hizmetlerin (“Ürün / Ürünler”) ALICI’ya satışı, teslimi ve
            tarafların hak ve yükümlülüklerine ilişkin hükümleri kapsar.
          </p>
          <p className="text-foreground/60">
            ALICI, bu sözleşmeyi internet sitesinde onayladıktan sonra, sipariş aşamasında
            Ürün(ler)’in bedeli ve varsa kargo dahil toplam maliyeti, seçilen ödeme yöntemiyle
            tahsil edilir.
          </p>
          <p className="text-foreground/60">
            İnternet sitemize üye olan ve alışveriş yapan her müşteri, aşağıda belirtilen
            satış sözleşmesi şartlarını okumuş, anlamış ve kabul etmiş sayılır.
          </p>
        </header>

        <section className="space-y-6">
          <div className="border-l-4 border-secondary pl-6 py-2">
            <h2 className="text-2xl font-semibold">MADDE 1: TARAFLAR</h2>
          </div>
          <div className="space-y-4 text-foreground/70">
            <div>
              <h3 className="font-semibold uppercase tracking-wide">SATICI</h3>
              <p>RAVORCOLLECTION</p>
              <p>www.ravorcollection.com</p>
              <p>E-posta: info@ravorcollection.com</p>
              <p>Telefon: (iletişim numarası eklenecektir)</p>
            </div>
            <div>
              <h3 className="font-semibold uppercase tracking-wide">ALICI</h3>
              <p>
                Sipariş formunda yer alan, alışveriş yapan kişi. Ad/Soyad, adres, e-posta ve
                telefon bilgileri esas alınır.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="border-l-4 border-secondary pl-6 py-2">
            <h2 className="text-2xl font-semibold">MADDE 2: SÖZLEŞME KONUSU ÜRÜN BİLGİLERİ</h2>
          </div>
          <p className="text-foreground/70">
            Ürünlerin türü, cinsi, miktarı, adedi, satış bedeli, ödeme şekli ve teslimat
            bilgileri siparişin tamamlandığı anda ALICI tarafından onaylanan bilgilerden
            oluşur.
          </p>
        </section>

        <section className="space-y-6">
          <div className="border-l-4 border-secondary pl-6 py-2">
            <h2 className="text-2xl font-semibold">MADDE 3: GENEL HÜKÜMLER</h2>
          </div>
          <ol className="list-decimal pl-6 space-y-3 text-foreground/70">
            <li>
              ALICI, sözleşme konusu ürünlerin temel nitelikleri, satış fiyatı, ödeme şekli ve
              teslimat koşulları hakkında internet sitesinde yer alan tüm ön bilgileri okuyup
              bilgi sahibi olduğunu ve bu bilgileri elektronik ortamda onayladığını kabul ve
              beyan eder.
            </li>
            <li>
              Sözleşme konusu ürün, yasal 30 günlük süreyi aşmamak kaydıyla, ALICI’nın
              yerleşim yerinin uzaklığına bağlı olarak ön bilgilendirme formunda belirtilen
              süre içerisinde ALICI’ya veya ALICI’nın gösterdiği adresteki kişi/kuruluşa teslim
              edilir.
            </li>
            <li>
              Ürün ALICI dışında bir kişi/kuruluşa teslim edilecekse, teslim edilecek
              kişi/kuruluşun ürünü teslim almamasından SATICI sorumlu değildir.
            </li>
            <li>
              Teslimat adresinde alıcı bulunmadığında, kargo firmasıyla iletişime geçip
              teslimatı takip etmek ALICI’nın sorumluluğundadır.
            </li>
            <li>
              Ürün’ün kargo firmasında beklemesinden veya iade edilmesinden doğan ek giderler
              ALICI’ya aittir.
            </li>
            <li>
              ALICI, teslim aldığı ürünleri kontrol etmekle yükümlüdür. Kargodan kaynaklanan
              herhangi bir hasar veya eksiklik tespit ettiğinde ürünü teslim almamalı ve durumu
              kargo görevlisiyle birlikte tutanak altına almalıdır. Aksi halde sorumluluk
              ALICI’ya aittir.
            </li>
            <li>
              Aksi belirtilmedikçe teslimat masrafları (kargo ücreti vb.) ALICI’ya aittir.
              Ravorcollection, dönemsel kampanyalar kapsamında bu masrafları kendi insiyatifinde
              karşılayabilir.
            </li>
            <li>
              Ürün bedeli tamamen ödenmeden ürün teslim edilmez. Peşin satışlarda ürün bedeli
              teslimattan önce ödenmelidir.
            </li>
            <li>
              Ravorcollection, satılan ürünleri sağlam, eksiksiz ve siparişte belirtilen
              niteliklere uygun olarak, varsa garanti belgeleriyle birlikte teslim etmekle
              yükümlüdür.
            </li>
            <li>
              Ürün tesliminden sonra ALICI’ya ait kredi kartının, ALICI’nın kusurundan
              kaynaklanmayan şekilde kötüye kullanılması sonucu banka tarafından SATICI’ya ödeme
              yapılmaması durumunda, ALICI, ürünü 3 gün içinde Ravorcollection’a iade etmekle
              yükümlüdür. Nakliye giderleri ALICI’ya aittir.
            </li>
            <li>
              Mücbir sebepler nedeniyle teslimat yapılamaması durumunda, ALICI bilgilendirilir.
              ALICI, siparişin iptali, benzer bir ürünle değişimi veya teslimatın ertelenmesi
              seçeneklerinden birini tercih edebilir.
            </li>
            <li>
              ALICI’nın siparişi iptal etmesi durumunda, ödediği tutar 10 gün içinde kendisine
              iade edilir. Kredi kartı ödemelerinde iade, ilgili banka aracılığıyla
              gerçekleştirilir. Banka işlem sürelerinden doğan gecikmelerden Ravorcollection
              sorumlu değildir.
            </li>
            <li>
              SATICI, stok tükenmesi gibi durumlarda ALICI’nın onayıyla eşdeğer kalite ve
              fiyatta başka bir ürün tedarik edebilir. ALICI onay vermezse sipariş iptal edilir.
            </li>
            <li>
              İşbu sözleşmeden doğabilecek uyuşmazlıklarda Ravorcollection kayıtları esas alınır.
            </li>
          </ol>
        </section>

        <section className="space-y-6">
          <div className="border-l-4 border-secondary pl-6 py-2">
            <h2 className="text-2xl font-semibold">MADDE 4: CAYMA HAKKI</h2>
          </div>
          <ol className="list-decimal pl-6 space-y-3 text-foreground/70">
            <li>
              ALICI, ürünün tesliminden itibaren 2 gün içinde cayma hakkını kullanabilir. Cayma
              bildirimi, e-posta veya iletişim kanalları aracılığıyla Ravorcollection’a
              iletilmelidir. Ürün kullanılmamış, ambalajı açılmamış ve tekrar satılabilir durumda
              olmalıdır.
            </li>
            <li>
              Cayma hakkı kullanıldığında, ürün Ravorcollection’a gönderilmeli, kargo teslim
              tutanağı ve fatura aslı ibraz edilmelidir. Bu belgelerin ulaşmasını takiben 10 gün
              içinde ürün bedeli ALICI’ya iade edilir.
            </li>
            <li>
              Kişisel hijyen ürünleri, iç giyim, aksesuar veya tek kullanımlık ürünlerde cayma
              hakkı bulunmamaktadır.
            </li>
          </ol>
        </section>

        <section className="space-y-6">
          <div className="border-l-4 border-secondary pl-6 py-2">
            <h2 className="text-2xl font-semibold">MADDE 5: UYUŞMAZLIKLARIN ÇÖZÜMÜ</h2>
          </div>
          <p className="text-foreground/70">
            İşbu sözleşmeden doğabilecek uyuşmazlıklarda, ALICI’nın yerleşim yerindeki veya
            SATICI’nın bulunduğu yerdeki Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri
            yetkilidir.
          </p>
        </section>

        <section className="space-y-6">
          <div className="border-l-4 border-secondary pl-6 py-2">
            <h2 className="text-2xl font-semibold">MADDE 6: KABUL BEYANI</h2>
          </div>
          <p className="text-foreground/70">
            ALICI, www.ravorcollection.com internet sitesinde yer alan tüm ön bilgilendirmeleri
            okuduğunu, satışa konu ürünlerin temel nitelikleri, satış fiyatı, ödeme şekli,
            teslimat koşulları, cayma hakkı ve diğer tüm koşullar hakkında bilgi sahibi olduğunu;
            bu sözleşme hükümlerini elektronik ortamda onaylayarak kabul ettiğini beyan eder.
          </p>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-center text-foreground/60 space-y-1">
          <p>SATICI: RAVORCOLLECTION</p>
          <p>www.ravorcollection.com</p>
        </footer>
      </div>
    </div>
  );
}
