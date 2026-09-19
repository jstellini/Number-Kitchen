# Tiny local web server so the game can be opened on this PC or, over Wi-Fi, on the iPad.
# Run as Administrator the first time so Windows lets other devices connect.
param([int]$Port = 8000)

Add-Type -AssemblyName System.Net.HttpListener -ErrorAction SilentlyContinue
$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:$Port/")
try { $listener.Start() } catch {
  Write-Host "Could not listen on all interfaces - falling back to localhost only." -ForegroundColor Yellow
  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add("http://localhost:$Port/")
  $listener.Start()
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
       Select-Object -First 1).IPAddress
Write-Host "Number Kitchen serving $root"
Write-Host "  On this PC : http://localhost:$Port/"
if ($ip) { Write-Host "  On the iPad: http://${ip}:$Port/" }
Write-Host "Ctrl+C to stop."

$types = @{ '.html'='text/html'; '.css'='text/css'; '.js'='application/javascript';
            '.json'='application/json'; '.mp3'='audio/mpeg'; '.svg'='image/svg+xml';
            '.png'='image/png'; '.ico'='image/x-icon' }

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
  if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
  $path = Join-Path $root $rel
  if (Test-Path $path -PathType Leaf) {
    $bytes = [IO.File]::ReadAllBytes($path)
    $ext = [IO.Path]::GetExtension($path).ToLower()
    $ctx.Response.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
    $ctx.Response.Headers.Add('Cache-Control', 'no-store')
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
  }
  $ctx.Response.Close()
}
