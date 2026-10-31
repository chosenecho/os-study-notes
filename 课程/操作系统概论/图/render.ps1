param(
  [string]$Dir = $PSScriptRoot
)
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$svgFiles = Get-ChildItem -LiteralPath $Dir -Filter *.svg | Sort-Object Name
$tmp = Join-Path $Dir "_render"
if (-not (Test-Path -LiteralPath $tmp)) { New-Item -ItemType Directory -Path $tmp | Out-Null }

foreach ($svg in $svgFiles) {
    $raw = Get-Content -LiteralPath $svg.FullName -Raw -Encoding utf8
    $mW = [regex]::Match($raw, 'width="(\d+)"')
    $mH = [regex]::Match($raw, 'height="(\d+)"')
    $w = [int]$mW.Groups[1].Value
    $h = [int]$mH.Groups[1].Value

    $html = @"
<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#fff}img{display:block;width:${w}px;height:${h}px}</style>
</head><body><img src="$($svg.Name)"></body></html>
"@
    $htmlPath = Join-Path $tmp ($svg.BaseName + ".html")
    Set-Content -LiteralPath $htmlPath -Value $html -Encoding utf8

    $png = Join-Path $Dir ($svg.BaseName + ".png")
    if (Test-Path -LiteralPath $png) { Remove-Item -LiteralPath $png -Force }

    $args = @(
        "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--force-device-scale-factor=2",
        "--window-size=$w,$h",
        "--screenshot=$png",
        "file:///" + ($htmlPath -replace '\\','/')
    )
    & $chrome @args 2>$null | Out-Null

    if (Test-Path -LiteralPath $png) {
        $len = (Get-Item -LiteralPath $png).Length
        "OK   {0,-42} {1}x{2}  {3} bytes" -f $svg.BaseName, $w, $h, $len
    } else {
        "FAIL {0}" -f $svg.BaseName
    }
}
