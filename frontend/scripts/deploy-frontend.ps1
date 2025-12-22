
param(
    [string]$VercelToken,
    [string]$ProjectId,
    [string]$BackendUrl,
    [string]$GitRepo,
    [string]$GitRef
)

$headers = @{
    "Authorization" = "Bearer $VercelToken"
    "Content-Type"  = "application/json"
}

# Step 1: Add/Update Environment Variable
Write-Output "Vercel projesine NEXT_PUBLIC_BACKEND_URL ayarlanıyor: $ProjectId..."
$envBody = @{
    key    = "NEXT_PUBLIC_BACKEND_URL"
    value  = $BackendUrl
    type   = "encrypted"
    target = @("production", "preview", "development")
} | ConvertTo-Json

try {
    # Değişkenin mevcut olup olmadığını kontrol et
    $existingEnvs = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$ProjectId/env" -Headers $headers -ErrorAction SilentlyContinue
    $existingVar = $existingEnvs.envs | Where-Object { $_.key -eq "NEXT_PUBLIC_BACKEND_URL" }

    if ($existingVar) {
        Write-Output "Ortam değişkeni zaten var. Doğru değeri sağlamak için silinip yeniden eklenecek."
        Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$ProjectId/env/$($existingVar.id)" -Method Delete -Headers $headers -ErrorAction Stop
    }

    Write-Output "Yeni ortam değişkeni ekleniyor..."
    Invoke-RestMethod -Uri "https://api.vercel.com/v10/projects/$ProjectId/env" -Method Post -Headers $headers -Body $envBody -ErrorAction Stop
    Write-Output "NEXT_PUBLIC_BACKEND_URL başarıyla ayarlandı."
}
catch {
    Write-Error "Ortam değişkeni ayarlanamadı. API Yanıtı:"
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $txt = $reader.ReadToEnd()
        Write-Error $txt
    }
    else {
        Write-Error $_.Exception.Message
    }
    exit 1
}

# Step 2: Trigger Deployment
Write-Output "Yeni Vercel dağıtımı başlatılıyor..."
$deployBody = @{
    name      = "aura" # Proje adınız Vercel'de 'aura' olarak varsayılıyor
    gitSource = @{
        type = "github"
        repo = $GitRepo
        ref  = $GitRef
    }
} | ConvertTo-Json

try {
    $deployResponse = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments" -Method Post -Headers $headers -Body $deployBody -ErrorAction Stop
    $deployId = $deployResponse.id
    Write-Output "Dağıtım başlatıldı. ID: $deployId, URL: $($deployResponse.url)"
}
catch {
    Write-Error "Dağıtım başlatılamadı. API Yanıtı:"
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $txt = $reader.ReadToEnd()
        Write-Error $txt
    }
    else {
        Write-Error $_.Exception.Message
    }
    exit 1
}

# Step 3: Poll for status
Write-Output "Dağıtım durumu kontrol ediliyor..."
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 10
    try {
        $statusResponse = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments/$deployId" -Headers $headers -ErrorAction Stop
        $status = $statusResponse.readyState
        Write-Output "[Kontrol $($i+1)/60] Dağıtım durumu: $status"
        if ($status -in @('READY', 'ERROR', 'CANCELED')) {
            break
        }
    }
    catch {
        Write-Warning "Durum kontrolü sırasında bir hata oluştu, yeniden deneniyor. Hata: $($_.Exception.Message)"
    }
}

# Final Status
$finalStatusResponse = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments/$deployId" -Headers $headers
Write-Output "---"
Write-Output "Dağıtım tamamlandı!"
Write-Output "Son Durum: $($finalStatusResponse.readyState)"
Write-Output "Canlı Site Adresi: https://$($finalStatusResponse.url)"
