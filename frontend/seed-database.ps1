# Database Seed Script
# Bu script Railway'deki database'i seed eder

Write-Host "🌱 Database seed işlemi başlatılıyor..." -ForegroundColor Green
Write-Host ""

# Railway backend URL
$backendUrl = "https://focused-friendship-production-290f.up.railway.app"

Write-Host "Backend URL: $backendUrl" -ForegroundColor Cyan
Write-Host "Endpoint: /api/seed/run" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "Seed endpoint'i çağrılıyor..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri "$backendUrl/api/seed/run" -Method POST -ContentType "application/json"
    
    Write-Host ""
    Write-Host "✅ Seed işlemi başarılı!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Admin Bilgileri:" -ForegroundColor Cyan
    Write-Host "  Email: $($response.data.admin.email)" -ForegroundColor White
    Write-Host "  Şifre: $($response.data.admin.password)" -ForegroundColor White
    Write-Host ""
    Write-Host "Oluşturulan Veriler:" -ForegroundColor Cyan
    Write-Host "  Ürünler: $($response.data.productsCount)" -ForegroundColor White
    Write-Host "  Kategoriler: $($response.data.categoriesCount)" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 Artık admin panele giriş yapabilirsiniz!" -ForegroundColor Green
    Write-Host "   URL: https://ravorcollection.com/admin/giris" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "❌ Hata oluştu!" -ForegroundColor Red
    Write-Host "Hata detayı: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "HTTP Status Code: $statusCode" -ForegroundColor Yellow
        
        if ($statusCode -eq 404) {
            Write-Host ""
            Write-Host "⚠️  Endpoint bulunamadı. Railway deploy'u tamamlanmamış olabilir." -ForegroundColor Yellow
            Write-Host "   Lütfen 1-2 dakika bekleyin ve tekrar deneyin." -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "Script tamamlandı." -ForegroundColor Gray
