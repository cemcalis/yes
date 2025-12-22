$base='https://aura-backend-kuzk.onrender.com'
$loginBody = @{ email='admin@ravor.com'; password='admin123' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$base/api/admin/auth/login" -Method Post -ContentType 'application/json' -Body $loginBody -ErrorAction Stop
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }

$images = @('/uploads/ürün1.png','/uploads/ürün1.1.png','/uploads/ürün1.2.png')
$body = @{
    name = 'Auto Product 1'
    price = 199.99
    description = 'Auto created product 1'
    image = $images[0]
    images = $images
    category_id = 1
    stock = 100
    sizes = @('XS','S','M','L','XL','XXL')
    colors = @('Default')
} | ConvertTo-Json -Depth 6

try {
    $res = Invoke-RestMethod -Uri "$base/api/admin/products" -Method Post -ContentType 'application/json' -Headers $headers -Body $body -ErrorAction Stop
    Write-Output "Created: $($res | ConvertTo-Json -Depth 3)"
} catch {
    Write-Output "Error: $($_.Exception.Message)"
    if ($_.Exception.Response -ne $null) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $text = $reader.ReadToEnd()
        Write-Output "Response body: $text"
    }
}
