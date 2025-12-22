$renderKey = 'rnd_CubntXSGiCGooWCppSTT5zxpDGiv'
$serviceId = 'srv-d4opp2s9c44c73fm08r0'
Write-Output "Posting deploy..."
$res = Invoke-RestMethod -Method Post -Uri "https://api.render.com/v1/services/$serviceId/deploys" -Headers @{ Authorization = "Bearer $renderKey" } -Body '{}' -ContentType 'application/json' -ErrorAction Stop
Write-Output "Deploy posted. id: $($res.id)"
$deployId = $res.id
$d = $null
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 6
    $d = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$serviceId/deploys/$deployId" -Headers @{ Authorization = "Bearer $renderKey" } -ErrorAction Stop
    Write-Output ("[poll][$i] state=" + $d.state)
    if ($d.state -eq 'success' -or $d.state -eq 'failed') { break }
}
Write-Output "Final state: $($d.state)"
if ($d.logUrl) { Write-Output "Log URL: $($d.logUrl)" } else { Write-Output 'No logUrl returned.' }
