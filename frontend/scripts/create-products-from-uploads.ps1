$base = 'https://aura-backend-kuzk.onrender.com'

# Ensure uploads dir exists
$uploadsDir = Join-Path $PSScriptRoot '..\backend\public\uploads'
if (-not (Test-Path $uploadsDir)) { New-Item -ItemType Directory -Path $uploadsDir -Force | Out-Null }

# Copy images into backend uploads
Write-Output "Copying product1 images..."
Copy-Item -Path (Join-Path $PSScriptRoot 'images\product1\*') -Destination $uploadsDir -Force -ErrorAction SilentlyContinue
Write-Output "Copying product2 images..."
Copy-Item -Path (Join-Path $PSScriptRoot 'images\product2\*') -Destination $uploadsDir -Force -ErrorAction SilentlyContinue

# Admin login
Write-Output "Logging in admin..."
$loginBody = @{ email = 'admin@ravor.com'; password = 'admin123' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$base/api/admin/auth/login" -Method Post -ContentType 'application/json' -Body $loginBody -ErrorAction Stop
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }
try { Write-Output ("Admin login response: " + ($login | ConvertTo-Json -Depth 4)) } catch { }
Write-Output "Admin token length: $($token.Length)"

function CreateProductFromFiles($name, $price, $fileNames) {
    $images = $fileNames | ForEach-Object { "/uploads/$_" }
    # generate a safe, unique slug to avoid duplicate key errors
    $baseSlug = $name.ToLower() -replace "\s+", "-"
    $baseSlug = $baseSlug -replace "[^a-z0-9-]", ""
    $slug = "$baseSlug-$(Get-Date -Format 'yyyyMMddHHmmss')"

    $body = @{
        name        = $name
        slug        = $slug
        price       = $price
        description = "$name - uploaded from repo uploads"
        image       = $images[0]
        images      = $images
        category_id = 1
        stock       = 100
        sizes       = @('XS', 'S', 'M', 'L', 'XL', 'XXL')
        colors      = @('Default')
    } | ConvertTo-Json -Depth 6

    try {
        $res = Invoke-RestMethod -Uri "$base/api/admin/products" -Method Post -ContentType 'application/json' -Headers $headers -Body $body -ErrorAction Stop
        Write-Output "Created product $name id: $($res.data.id)"
        try { Write-Output ("RESP: " + ($res | ConvertTo-Json -Depth 6)) } catch { }
        return $res.data.id
    }
    catch {
        Write-Output "Create product error: $($_.Exception.Message)"
        if ($_.Exception.Response) {
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $body = $reader.ReadToEnd()
                Write-Output "Response body: $body"
            }
            catch { }
        }
        return $null
    }
}

# Gather filenames directly from the source image folders (avoid Unicode matching issues)
$product1SrcDir = Join-Path $PSScriptRoot 'images\product1'
$product2SrcDir = Join-Path $PSScriptRoot 'images\product2'
$product1Files = @()
$product2Files = @()
if (Test-Path $product1SrcDir) { $product1Files = Get-ChildItem -Path $product1SrcDir -File | Select-Object -ExpandProperty Name | Sort-Object }
if (Test-Path $product2SrcDir) { $product2Files = Get-ChildItem -Path $product2SrcDir -File | Select-Object -ExpandProperty Name | Sort-Object }

Write-Output "product1 files: $($product1Files -join ', ')"
Write-Output "product2 files: $($product2Files -join ', ')"

$id1 = $null; $id2 = $null
if ($product1Files.Count -gt 0) {
    Write-Output "Creating product1..."
    $id1 = CreateProductFromFiles 'Auto Product 1' 199.99 $product1Files
    Write-Output "Create returned id1: $id1"
}
if ($product2Files.Count -gt 0) {
    Write-Output "Creating product2..."
    $id2 = CreateProductFromFiles 'Auto Product 2' 219.99 $product2Files
    Write-Output "Create returned id2: $id2"
}

# Quick smoke
try { $h = Invoke-RestMethod -Uri "$base/api/health" -Method Get -ErrorAction Stop; Write-Output "HEALTH: $($h.status)" } catch { Write-Output "HEALTH ERROR: $($_.Exception.Message)" }
try {
    $prods = Invoke-RestMethod -Uri "$base/api/products" -Method Get -ErrorAction Stop
    $count = 0
    if ($prods -is [System.Array]) { $count = $prods.Length }
    elseif ($prods -and $prods.data -and $prods.data.products) { $count = $prods.data.products.Count }
    elseif ($prods -and $prods.data -and $prods.data.length) { $count = $prods.data.length }
    Write-Output "PRODUCTS COUNT: $count"
}
catch { Write-Output "PRODUCTS ERROR: $($_.Exception.Message)" }

# Try guest order with id1
if ($id1) {
    try {
        $guestOrder = @{ customer_name = 'Guest Buyer'; customer_email = 'guest+test@example.com'; customer_phone = '05000000000'; shipping_address = 'Sahte Adres Mah. No:1'; items = @(@{ product_id = $id1; variant_id = $null; quantity = 1; price = 199.99 }); total_amount = 199.99; payment_method = 'credit_card' } | ConvertTo-Json -Depth 6
        $order = Invoke-RestMethod -Uri "$base/api/orders" -Method Post -ContentType 'application/json' -Body $guestOrder -ErrorAction Stop
        Write-Output "GUEST ORDER OK: order_id=$($order.order_id)"
    }
    catch { Write-Output "GUEST ORDER ERROR: $($_.Exception.Message)" }
}
