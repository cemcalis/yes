$base = 'https://aura-backend-kuzk.onrender.com'
$payload = @{
    customer_name    = 'Guest Buyer'
    customer_email   = 'guest+test@example.com'
    customer_phone   = '05000000000'
    shipping_address = 'Sahte Adres Mah. No:1'
    items            = @(
        @{ product_id = 29; variant_id = $null; quantity = 1; price = 199.99 }
    )
    total_amount     = 199.99
    payment_method   = 'credit_card'
}
$body = $payload | ConvertTo-Json -Depth 6
Write-Output "Posting guest order to $base/api/orders"
try {
    $resp = Invoke-RestMethod -Uri "$base/api/orders" -Method Post -ContentType 'application/json' -Body $body -ErrorAction Stop
    Write-Output "ORDER OK: $($resp | ConvertTo-Json -Depth 6)"
}
catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        try {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $txt = $reader.ReadToEnd()
            Write-Output "RESPONSE_BODY: $txt"
        }
        catch {
            Write-Output "Failed to read response body: $($_.Exception.Message)"
        }
    }
}
