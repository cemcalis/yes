# API Test Script
# Tüm endpoint'leri test eder ve sorunları raporlar

$baseUrl = "https://ravorcollection.com/api"
$results = @()

Write-Host "🧪 API Test Başlatılıyor..." -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor Gray
Write-Host ""

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [object]$Body = $null
    )
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            UseBasicParsing = $true
            ErrorAction = 'Stop'
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params
        
        Write-Host "✅ $Name" -ForegroundColor Green
        Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Gray
        
        return @{
            Name = $Name
            Status = "✅ PASS"
            StatusCode = $response.StatusCode
            Error = $null
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMsg = $_.Exception.Message
        
        if ($statusCode -eq 401 -or $statusCode -eq 404) {
            Write-Host "⚠️  $Name" -ForegroundColor Yellow
            Write-Host "   Status: $statusCode - $errorMsg" -ForegroundColor Gray
            
            return @{
                Name = $Name
                Status = "⚠️  WARNING"
                StatusCode = $statusCode
                Error = $errorMsg
            }
        } else {
            Write-Host "❌ $Name" -ForegroundColor Red
            Write-Host "   Error: $errorMsg" -ForegroundColor Gray
            
            return @{
                Name = $Name
                Status = "❌ FAIL"
                StatusCode = $statusCode
                Error = $errorMsg
            }
        }
    }
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "1. GENEL ENDPOINT'LER" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$results += Test-Endpoint "Health Check" "$baseUrl/health"
$results += Test-Endpoint "Version Info" "$baseUrl/version"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "2. ÜRÜN ENDPOINT'LERİ" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$results += Test-Endpoint "Tüm Ürünler" "$baseUrl/products"
$results += Test-Endpoint "Yeni Ürünler" "$baseUrl/products?new_arrivals=true"
$results += Test-Endpoint "Öne Çıkan Ürünler" "$baseUrl/products?featured=true"
$results += Test-Endpoint "Tek Ürün" "$baseUrl/products/slim-fit-erkek-kot-pantolon"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "3. KATEGORİ ENDPOINT'LERİ" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$results += Test-Endpoint "Tüm Kategoriler" "$baseUrl/categories"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "4. SEPET ENDPOINT'LERİ" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$results += Test-Endpoint "Sepet Session Oluştur" "$baseUrl/cart/session" "POST"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "5. AUTH ENDPOINT'LERİ" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$loginData = @{ email = "test@test.com"; password = "test123" }
$results += Test-Endpoint "Login (Geçersiz)" "$baseUrl/auth/login" "POST" $loginData

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "6. ADMIN ENDPOINT'LERİ" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$adminLogin = @{ email = "admin@ravor.com"; password = "admin123" }
$results += Test-Endpoint "Admin Login" "$baseUrl/admin/auth/login" "POST" $adminLogin

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "7. SEED ENDPOINT'LERİ" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$results += Test-Endpoint "Create Admin" "$baseUrl/seed/create-admin" "POST"
$results += Test-Endpoint "Seed Database" "$baseUrl/seed/run" "POST"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "ÖZET" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$passed = ($results | Where-Object { $_.Status -eq "✅ PASS" }).Count
$warnings = ($results | Where-Object { $_.Status -eq "⚠️  WARNING" }).Count
$failed = ($results | Where-Object { $_.Status -eq "❌ FAIL" }).Count

Write-Host ""
Write-Host "Toplam Test: $($results.Count)" -ForegroundColor White
Write-Host "Başarılı: $passed" -ForegroundColor Green
Write-Host "Uyarı: $warnings" -ForegroundColor Yellow
Write-Host "Başarısız: $failed" -ForegroundColor Red
Write-Host ""

if ($failed -gt 0) {
    Write-Host "BAŞARISIZ TESTLER:" -ForegroundColor Red
    $results | Where-Object { $_.Status -eq "❌ FAIL" } | ForEach-Object {
        Write-Host "  - $($_.Name): $($_.Error)" -ForegroundColor Red
    }
    Write-Host ""
}

if ($warnings -gt 0) {
    Write-Host "UYARILAR:" -ForegroundColor Yellow
    $results | Where-Object { $_.Status -eq "⚠️  WARNING" } | ForEach-Object {
        Write-Host "  - $($_.Name): $($_.Error)" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "Test tamamlandı!" -ForegroundColor Cyan
