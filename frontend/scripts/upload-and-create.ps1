$base='https://aura-backend-kuzk.onrender.com'

Write-Output "Logging in admin..."
$loginBody = @{ email='admin@ravor.com'; password='admin123' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$base/api/admin/auth/login" -Method Post -ContentType 'application/json' -Body $loginBody -ErrorAction Stop
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }

function UploadFolder($folder) {
  $urls = @()
  $files = Get-ChildItem -Path $folder -File
  foreach ($f in $files) {
    Write-Output "Uploading $($f.Name)"
    # Use HttpClient + MultipartFormDataContent for compatibility with Windows PowerShell
    $uri = "$base/api/admin/upload"
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $content = New-Object System.Net.Http.ByteArrayContent($bytes)
    $content.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse((Get-Item $f.FullName).Extension -replace '^\.', 'image/')
    $multipart = New-Object System.Net.Http.MultipartFormDataContent
    $multipart.Add($content, 'file', $f.Name)

    $handler = New-Object System.Net.Http.HttpClientHandler
    $client = New-Object System.Net.Http.HttpClient($handler)
    $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('Bearer', $token)

    $resp = $client.PostAsync($uri, $multipart).Result
    $respContent = $resp.Content.ReadAsStringAsync().Result
    try {
      $respObj = $respContent | ConvertFrom-Json
      Write-Output " -> $($respObj.url)"
      $urls += $respObj.url
    } catch {
      Write-Output "Upload response parse failed: $respContent"
    }
  }
  return $urls
}

# Create product helper
function CreateProduct($name, $price, $urls) {
  $body = @{
    name = $name
    price = $price
    description = "$name - uploaded"
    image = $urls[0]
    images = $urls
    category_id = 1
    stock = 100
    sizes = @('XS','S','M','L','XL','XXL')
    colors = @('Default')
  } | ConvertTo-Json -Depth 6

  $res = Invoke-RestMethod -Uri "$base/api/admin/products" -Method Post -ContentType 'application/json' -Headers $headers -Body $body -ErrorAction Stop
  return $res.data.id
}

# Product 1
$prod1Folder = Join-Path $PSScriptRoot 'images\product1'
if (Test-Path $prod1Folder) {
  $urls1 = UploadFolder $prod1Folder
  if ($urls1.Count -gt 0) {
    $id1 = CreateProduct 'Auto Product 1' 199.99 $urls1
    Write-Output "Product1 created id: $id1"
  } else { Write-Output "No uploads for product1" }
} else { Write-Output "Product1 folder missing: $prod1Folder" }

# Product 2
$prod2Folder = Join-Path $PSScriptRoot 'images\product2'
if (Test-Path $prod2Folder) {
  $urls2 = UploadFolder $prod2Folder
  if ($urls2.Count -gt 0) {
    $id2 = CreateProduct 'Auto Product 2' 219.99 $urls2
    Write-Output "Product2 created id: $id2"
  } else { Write-Output "No uploads for product2" }
} else { Write-Output "Product2 folder missing: $prod2Folder" }

# Quick smoke tests
Write-Output "\n== Smoke tests =="
try { $h = Invoke-RestMethod -Uri "$base/api/health" -Method Get -ErrorAction Stop; Write-Output "HEALTH: $($h.status)" } catch { Write-Output "HEALTH ERROR: $($_.Exception.Message)" }

try { $prods = Invoke-RestMethod -Uri "$base/api/products" -Method Get -ErrorAction Stop; Write-Output "PRODUCTS COUNT: $($prods.data.products.Count)" } catch { Write-Output "PRODUCTS ERROR: $($_.Exception.Message)" }

# Try register + order using created product1 id if present
if ($id1) {
  $ts = (Get-Date -Format yyyyMMddHHmmss)
  $email = "test+$ts@example.com"
  $regBody = @{ email=$email; password='secret123'; name='Test User'; phone='05001234567'; address='Test Address' } | ConvertTo-Json
  try { $reg = Invoke-RestMethod -Uri "$base/api/auth/register" -Method Post -ContentType 'application/json' -Body $regBody -ErrorAction Stop; Write-Output "REGISTER OK id=$($reg.user.id)" } catch { Write-Output "REGISTER ERROR: $($_.Exception.Message)" }

  try {
    $orderBody = @{ customer_name='Test Buyer'; customer_email=$email; customer_phone='05000000000'; shipping_address='Test Addr'; items=@(@{ product_id = $id1; variant_id=$null; quantity=1; price=199.99 }); total_amount=199.99; payment_method='credit_card' } | ConvertTo-Json -Depth 6
    $order = Invoke-RestMethod -Uri "$base/api/orders" -Method Post -ContentType 'application/json' -Body $orderBody -ErrorAction Stop
    Write-Output "ORDER CREATED: $($order.order_id)"
  } catch { Write-Output "ORDER ERROR: $($_.Exception.Message)" }
}
