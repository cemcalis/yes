# PowerShell automation script
# Usage: Put product images under `scripts\images\` and run this script from repository root:
#   pwsh ./scripts/create-and-test.ps1

$base = 'https://aura-backend-kuzk.onrender.com'
$imagesDir = Join-Path $PSScriptRoot 'images'

function Ensure-Admin {
    Write-Output "Creating admin user (admin@ravor.com / admin123)..."
    try {
        $res = Invoke-RestMethod -Uri "$base/api/seed/create-admin" -Method Post -ErrorAction Stop
        Write-Output ($res | ConvertTo-Json -Depth 3)
    }
    catch {
        Write-Output "Admin create error: $($_.Exception.Message)"
    }
}

function Admin-Login {
    param($email = 'admin@ravor.com', $password = 'admin123')
    Write-Output "Logging in as admin..."
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    try {
        $res = Invoke-RestMethod -Uri "$base/api/admin/auth/login" -Method Post -ContentType 'application/json' -Body $body -ErrorAction Stop
        return $res.token
    }
    catch {
        Write-Output "Admin login failed: $($_.Exception.Message)"
        return $null
    }
}

function Upload-Image {
    param($token, $filePath)
    $url = "$base/api/admin/upload"
    Write-Output "Uploading $filePath"
    try {
        $form = @{ file = Get-Item $filePath }
        $headers = @{ Authorization = "Bearer $token" }
        $res = Invoke-RestMethod -Uri $url -Method Post -Form $form -Headers $headers -ErrorAction Stop
        return $res.url
    }
    catch {
        Write-Output "Upload failed: $($_.Exception.Message)"
        return $null
    }
}

function Create-Product {
    param($token, $name, $price, $imageUrl)
    $url = "$base/api/admin/products"
    $sizes = @('XS', 'S', 'M', 'L', 'XL', 'XXL')
    $body = @{
        name        = $name
        price       = $price
        description = "$name - uploaded via automation"
        image       = $imageUrl
        images      = @($imageUrl)
        category_id = 1
        stock       = 100
        sizes       = $sizes
        colors      = @('Default')
    } | ConvertTo-Json -Depth 5

    try {
        $headers = @{ Authorization = "Bearer $token" }
        $res = Invoke-RestMethod -Uri $url -Method Post -ContentType 'application/json' -Headers $headers -Body $body -ErrorAction Stop
        Write-Output "Product created: $($res.data.id)"
        return $res.data.id
    }
    catch {
        Write-Output "Create product failed: $($_.Exception.Message)"
        return $null
    }
}

function Run-Tests {
    param($productId)
    Write-Output "\n== Running tests =="
    # Health
    try { $h = Invoke-RestMethod -Uri "$base/api/health" -Method Get -ErrorAction Stop; Write-Output "HEALTH: $($h.status)" } catch { Write-Output "HEALTH ERROR: $($_.Exception.Message)" }

    # Products list
    try { $p = Invoke-RestMethod -Uri "$base/api/products" -Method Get -ErrorAction Stop; Write-Output "PRODUCTS: returned (may be paginated)" } catch { Write-Output "PRODUCTS ERROR: $($_.Exception.Message)" }

    # Register
    $ts = (Get-Date -Format yyyyMMddHHmmss)
    $email = "test+$ts@example.com"
    $regBody = @{ email = $email; password = 'secret123'; name = "Test User $ts"; phone = '05001234567'; address = 'Test Address' } | ConvertTo-Json
    try { $reg = Invoke-RestMethod -Uri "$base/api/auth/register" -Method Post -ContentType 'application/json' -Body $regBody -ErrorAction Stop; Write-Output "REGISTER OK: userId=$($reg.user.id) token_len=$($reg.token.Length)" } catch { Write-Output "REGISTER ERROR: $($_.Exception.Message)" }

    # Login
    try { $login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -ContentType 'application/json' -Body (@{ email = $email; password = 'secret123' } | ConvertTo-Json) -ErrorAction Stop; $token = $login.token; Write-Output "LOGIN OK token_len=$($token.Length)" } catch { Write-Output "LOGIN ERROR: $($_.Exception.Message)"; $token = $null }

    # Create cart session
    try { $sess = Invoke-RestMethod -Uri "$base/api/cart/session" -Method Post -ErrorAction Stop; $sessionId = $sess.sessionId; Write-Output "SESSION: $sessionId" } catch { Write-Output "SESSION ERROR: $($_.Exception.Message)"; return }

    # Add to cart (registered)
    if ($productId) {
        $prodInfo = Invoke-RestMethod -Uri "$base/api/products" -Method Get -ErrorAction Stop
        $first = $prodInfo.data.products | Where-Object { $_.id -eq $productId } | Select-Object -First 1
        if (-not $first) { $first = $prodInfo.data.products[0] }
        if ($first) {
            $addBody = @{ product_id = $first.id; variant_id = $null; quantity = 1; price = [decimal]$first.price; name = $first.name; image_url = $first.image_url; size = 'M'; color = 'Default' } | ConvertTo-Json
            try { $cart = Invoke-RestMethod -Uri "$base/api/cart/$sessionId/add" -Method Post -ContentType 'application/json' -Body $addBody -ErrorAction Stop; Write-Output "ADD TO CART OK: items=$($cart.items.count) total=$($cart.total)" } catch { Write-Output "ADD ERROR: $($_.Exception.Message)" }
        }
        else {
            Write-Output "No product found to add to cart"
        }
    }

    # Create order (guest or registered) - we'll do guest later; here create order as guest to test flow
    try {
        $orderBody = @{ customer_name = 'Test Buyer'; customer_email = $email; customer_phone = '05000000000'; shipping_address = 'Test Shipping Address'; items = @(@{ product_id = $first.id; variant_id = $null; quantity = 1; price = [decimal]$first.price }); total_amount = [decimal]$first.price; payment_method = 'credit_card' } | ConvertTo-Json -Depth 6
        $order = Invoke-RestMethod -Uri "$base/api/orders" -Method Post -ContentType 'application/json' -Body $orderBody -ErrorAction Stop
        Write-Output "ORDER CREATED: order_id=$($order.order_id)"
    }
    catch { Write-Output "ORDER ERROR: $($_.Exception.Message)" }

    # Guest flow: new session, add to cart, guest order
    try { $guestSess = Invoke-RestMethod -Uri "$base/api/cart/session" -Method Post -ErrorAction Stop; $guestSessionId = $guestSess.sessionId; Write-Output "GUEST SESSION: $guestSessionId" } catch { Write-Output "GUEST SESSION ERROR: $($_.Exception.Message)"; return }
    try {
        $addBody = @{ product_id = $first.id; variant_id = $null; quantity = 1; price = [decimal]$first.price; name = $first.name; image_url = $first.image_url; size = 'M'; color = 'Default' } | ConvertTo-Json
        $cart = Invoke-RestMethod -Uri "$base/api/cart/$guestSessionId/add" -Method Post -ContentType 'application/json' -Body $addBody -ErrorAction Stop
        Write-Output "GUEST ADD TO CART OK: items=$($cart.items.count) total=$($cart.total)"

        $guestOrder = @{ customer_name = 'Guest Buyer'; customer_email = 'guest+test@example.com'; customer_phone = '05000000000'; shipping_address = 'Sahte Adres Mah. No:1'; items = @(@{ product_id = $first.id; variant_id = $null; quantity = 1; price = [decimal]$first.price }); total_amount = [decimal]$first.price; payment_method = 'credit_card' } | ConvertTo-Json -Depth 6
        $order = Invoke-RestMethod -Uri "$base/api/orders" -Method Post -ContentType 'application/json' -Body $guestOrder -ErrorAction Stop
        Write-Output "GUEST ORDER OK: order_id=$($order.order_id)"
    }
    catch { Write-Output "GUEST FLOW ERROR: $($_.Exception.Message)" }

    Write-Output "\n== Tests finished =="
}

# Main
Ensure-Admin
$token = Admin-Login
if (-not $token) { Write-Output "Cannot proceed without admin token"; exit 1 }

# Upload images from scripts/images
# Upload images organized by subfolders (each subfolder => one product)
if (-not (Test-Path $imagesDir)) {
    Write-Output "No images directory found at $imagesDir. Create and put images there, then re-run this script."; exit 0
}

$createdProductIds = @()
Get-ChildItem -Path $imagesDir -Directory | ForEach-Object {
    $dir = $_.FullName
    $files = Get-ChildItem -Path $dir -File
    if ($files.Count -eq 0) {
        Write-Output "No files in $dir, skipping"
        return
    }

    $uploadedUrls = @()
    foreach ($f in $files) {
        $u = Upload-Image -token $token -filePath $f.FullName
        if ($u) { $uploadedUrls += $u }
    }

    if ($uploadedUrls.Count -eq 0) {
        Write-Output "No uploads for $dir, skipping"
        return
    }

    $main = $uploadedUrls[0]
    $name = "Auto Product - $(Split-Path $dir -Leaf)"
    $price = 199.99

    # Create product using first image as main and all images as gallery
    $createdPid = Create-Product -token $token -name $name -price $price -imageUrl $main
    if ($createdPid) { $createdProductIds += $createdPid }
}

# Run tests using first created product id (if any)
$firstId = $createdProductIds | Select-Object -First 1
Run-Tests -productId $firstId

Write-Output "Script finished." 
