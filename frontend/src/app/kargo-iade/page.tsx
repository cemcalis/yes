export default function ShippingReturnsPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold uppercase">
            TESLİMAT VE DEĞİŞİM ŞARTLARI
          </h1>
          <p className="text-foreground/70">
            RAVOR COLLECTION, siparişiniz ve ödemenizin ardından size bir onay e-postası
            gönderir. RAVOR COLLECTION üzerinden yapılan tüm online alışverişler temel
            olarak sipariş üzerine hazırlanmakta olup, 2 ila 14 iş günü içerisinde teslim
            edilmektedir. Stokta bulunan ürünler ise 2 iş günü içerisinde kargoya verilir.
          </p>
          <p className="text-foreground/70">
            Özel siparişleriniz veya stokta bulunmayan ürünler, sipariş üzerine üretilerek 4
            ila 14 iş günü içerisinde tarafınıza teslim edilecek şekilde hazırlanır.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Yurt Dışı Siparişleri</h2>
          <p className="text-foreground/70">
            Yurt dışı siparişleri için teslimat süresi 4 ila 14 iş günü arasındadır. Fiyatlara
            yurt dışı kargo bedeli ve gümrük vergileri dahil değildir. Yurt dışı siparişlerde
            kargo bedeli alıcıya (müşteriye) aittir.
          </p>
          <p className="text-foreground/70">
            Bulunduğunuz ülke tarafından belirlenen ve ödenmesi gereken ek ücretler, gümrük
            veya vergi bedelleri tamamen alıcının sorumluluğundadır. RAVOR COLLECTION bu ek
            masraflardan sorumlu değildir.
          </p>
          <p className="text-foreground/70">
            Uluslararası gönderimlerde, gümrük işlemleri veya taşıma sürecinden
            kaynaklanabilecek gecikmelerden dolayı RAVOR COLLECTION sorumlu tutulamaz.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">DEĞİŞİM VE İADE KOŞULLARI</h2>
          <p className="text-foreground/70">
            RAVOR COLLECTION’dan yapılan tüm alışverişler, müşteri talebi doğrultusunda ve
            sipariş üzerine özel olarak hazırlanır. Bu nedenle, 6502 sayılı Tüketicinin
            Korunması Hakkında Kanunu ve ilgili yönetmelikler uyarınca, özel üretim veya
            kişiselleştirilmiş ürünlerde cayma hakkı bulunmamaktadır. Dolayısıyla bu ürünlerin
            iadesi veya değişimi yapılamamaktadır.
          </p>
          <p className="text-foreground/70">
            Hazır stoktan gönderilen ürünlerde, aşağıda belirtilen şartlar çerçevesinde değişim
            talebinde bulunulabilir:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/70">
            <li>Ürün, kullanılmamış, hasar görmemiş, etiketi çıkarılmamış ve orijinal ambalajı ile birlikte gönderilmelidir.</li>
            <li>Ürünün tesliminden itibaren en geç 2 (iki) gün içerisinde RAVOR COLLECTION’a yazılı olarak (e-posta veya iletişim formu aracılığıyla) bildirim yapılması gerekmektedir.</li>
            <li>Onay alınmadan gönderilen ürünlerin değişimi kabul edilmez.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Hatalı veya Ayıplı Ürünler</h2>
          <p className="text-foreground/70">
            Hatalı veya ayıplı ürünlerde, durumun RAVOR COLLECTION tarafından incelenip
            onaylanmasının ardından değişim işlemi yapılabilir. Değişim veya iade onayı verilmesi
            halinde, kargo, gümrük, vergi veya diğer işlem masrafları gibi tüm bedeller, ürünün
            iade tutarından düşülür.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Değişim Koşulları</h2>
          <p className="text-foreground/70">
            Beden veya renk değişimi yapmak istiyorsanız:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/70">
            <li>Mevcut ürünü iade koşullarına uygun olarak iade edin.</li>
            <li>İstediğiniz yeni ürün için stok durumu kontrol edilir.</li>
            <li>Eğer talep ettiğiniz ürün stokta mevcutsa değişim işlemi yapılır.</li>
            <li>Stokta bulunmayan ürünler için ise ödediğiniz tutar iade edilir.</li>
            <li>Dilerseniz müşteri hizmetlerimizle iletişime geçerek sürece dair destek alabilirsiniz.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Kargo Takibi</h2>
          <p className="text-foreground/70">
            Siparişiniz kargoya verildikten sonra e-posta adresinize kargo takip numarası
            gönderilecektir. Bu numara ile kargo firmasının web sitesinden gönderinizi takip
            edebilirsiniz.
          </p>
        </section>
      </div>
    </div>
  );
}
