$renderKey = 'rnd_CubntXSGiCGooWCppSTT5zxpDGiv'
$serviceId = 'srv-d4opp2s9c44c73fm08r0'
Write-Output "Render service: $serviceId"

function TryGetJson($uri) {
    try {
        $res = Invoke-RestMethod -Uri $uri -Headers @{ Authorization = "Bearer $renderKey" } -ErrorAction Stop
        return $res
    }
    catch {
        Write-Output "Request to $uri failed: $($_.Exception.Message)"
        return $null
    }
}

Write-Output "---- Events ----"
$events = TryGetJson "https://api.render.com/v1/services/$serviceId/events"
if ($events) { $events | Select-Object -First 10 | ForEach-Object { Write-Output ($_ | ConvertTo-Json -Depth 4) } }

Write-Output "---- Deploys ----"
$deploys = TryGetJson "https://api.render.com/v1/services/$serviceId/deploys"
if ($deploys) { $deploys | Select-Object -First 10 | ForEach-Object { Write-Output ($_ | ConvertTo-Json -Depth 4) } }

Write-Output "---- Logs (via deploys' logUrl) ----"
if ($deploys -and $deploys[0].logUrl) {
    $logUrl = $deploys[0].logUrl
    Write-Output "Using deploy[0].logUrl: $logUrl"
    # try to fetch the log url (may require no auth)
    try {
        $logText = Invoke-RestMethod -Uri $logUrl -ErrorAction Stop
        Write-Output "---- Log start ----"
        Write-Output $logText.Substring(0, [Math]::Min($logText.Length, 4000))
        Write-Output "---- Log end (truncated) ----"
    }
    catch {
        Write-Output "Failed to fetch logUrl: $($_.Exception.Message)"
    }
}
else {
    Write-Output "No deploy logUrl available from deploys list."
}

Write-Output "---- Recent Logs endpoint (unofficial) ----"
$logs = TryGetJson "https://api.render.com/v1/services/$serviceId/logs?limit=200"
if ($logs) { $logs | Select-Object -First 20 | ForEach-Object { Write-Output ($_ | ConvertTo-Json -Depth 6) } }
