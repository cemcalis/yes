$uploadsDir = Join-Path $PSScriptRoot '..\backend\public\uploads'
Write-Output "UploadsDir: $uploadsDir"
$files = Get-ChildItem -Path $uploadsDir -File -ErrorAction SilentlyContinue
Write-Output "Count: $($files.Count)"
foreach ($f in $files) { Write-Output "NAME: $($f.Name)" }
Write-Output "Filter ürun1:"
$files | Where-Object { $_.Name -like '*ürün1*' } | ForEach-Object { Write-Output "MATCH1: $($_.Name)" }
Write-Output "Filter ürün2:"
$files | Where-Object { $_.Name -like '*ürün2*' } | ForEach-Object { Write-Output "MATCH2: $($_.Name)" }
