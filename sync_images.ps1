$ServerIP = "37.148.208.196"
$RemotePath = "/var/www/yes/backend/public/uploads/"
$LocalPath = ".\backend\public\uploads\*"

Write-Host "Resimler $ServerIP adresine yükleniyor..."
Write-Host "Lütfen şifre sorulursa girin."

# Upload files using SCP
scp -r $LocalPath "root@${ServerIP}:${RemotePath}"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dosyalar başarıyla yüklendi."
} else {
    Write-Host "❌ Yükleme sırasında hata oluştu. Lütfen şifreyi doğru girdiğinizden emin olun."
}
