$base = 'https://aura-backend-kuzk.onrender.com'
try {
    $prods = Invoke-RestMethod -Uri "$base/api/products" -Method Get -ErrorAction Stop
    if ($null -eq $prods) { Write-Output "No products returned (null)"; exit }
    # If server returns array
    if ($prods -is [System.Array]) {
        Write-Output "COUNT: $($prods.Length)"
        $prods | Select-Object -First 5 | ForEach-Object { Write-Output ($_ | ConvertTo-Json -Depth 6) }
    }
    else {
        # sometimes server returns object -> print summary
        Write-Output "Returned object type: $($prods.GetType().FullName)"
        try { Write-Output ($prods | ConvertTo-Json -Depth 6) } catch { Write-Output "Could not convert to JSON" }
    }
}
catch {
    Write-Output "GET PRODUCTS ERROR: $($_.Exception.Message)"
}
