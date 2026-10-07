# Ejecutar personalmente en PowerShell. No recibe credenciales por argumentos.
[CmdletBinding()]
param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$worker = 'https://latam-world-news-d1-staging.anastacio-silveira.workers.dev'
$expectedHash = '86810b3e234d2dcf4c83fe34b3f70d7ac22e4f7856b660fdf0065237a2d9bab5'
$payloadPath = Join-Path $PSScriptRoot 'impacto-brasil-payload-previsto-NO-ENVIAR.json'
$bytes = [IO.File]::ReadAllBytes($payloadPath)
$sha = [Security.Cryptography.SHA256]::Create()
try { $hash = [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '').ToLowerInvariant() } finally { $sha.Dispose() }
if ($hash -cne $expectedHash) { throw 'SHA-256 distinto. No se enviara ninguna peticion.' }
$article = ([Text.Encoding]::UTF8.GetString($bytes) | ConvertFrom-Json).article
$publicUrl = 'https://latamworldnews.com/impacto/editorial/brasil-segunda-vuelta-2026-impacto-sudamerica'
if ($article.id -cne '74c78ff3-f3de-41c3-9544-f086d514c9d8' -or $article.slug -cne 'brasil-segunda-vuelta-2026-impacto-sudamerica' -or $article.url -cne $publicUrl -or $article.source_url -cne $publicUrl -or $article.source_type -cne 'manual' -or $article.editorial_status -cne 'ready' -or $article.editorial_review_status -cne 'approved' -or @($article.raw.editorial_sources).Count -ne 7 -or $article.image_url -cne 'https://latamworldnews.com/images/brasil-voto-y-conexiones-globales.png') { throw 'Payload inesperado. Detencion sin POST.' }
Write-Host "Worker: $worker"
Write-Host "SHA-256 confirmado: $hash"
if ($CheckOnly) { Write-Host 'Validacion local correcta. Sin red, secreto ni POST.'; return }
Add-Type -AssemblyName System.Net.Http
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$handler = [Net.Http.HttpClientHandler]::new()
$handler.AllowAutoRedirect = $false
$client = [Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds(60)
$secure = $null
$secret = $null
$posted = $false
function Invoke-Read([string]$url, [bool]$authenticated) {
    $request = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Get, $url)
    $response = $null
    try {
        if ($authenticated) { [void]$request.Headers.TryAddWithoutValidation('x-internal-api-secret', $secret) }
        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        return @{ Status = [int]$response.StatusCode; Body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() }
    } catch { throw 'Fallo de lectura HTTP. No se muestran detalles que pudieran contener credenciales.' }
    finally { if ($response) { $response.Dispose() }; $request.Dispose() }
}
function Find-Collisions {
    $matches = @{}
    $seen = @{}
    for ($page = 1; $page -le 10000; $page++) {
        $read = Invoke-Read "$worker/internal/articles?page=$page&pageSize=100" $true
        if ($read.Status -ne 200) { throw "Lectura interna HTTP $($read.Status). Detencion." }
        $data = $read.Body | ConvertFrom-Json
        if ($null -eq $data.data -or $null -eq $data.pagination -or $data.pagination.page -ne $page) { throw 'Respuesta interna inesperada. Detencion.' }
        $rows = @($data.data)
        foreach ($row in $rows) {
            if ($seen.ContainsKey([string]$row.id)) { throw 'Paginacion inestable: registro repetido. Detencion.' }
            $seen[[string]$row.id] = $true
            if ($row.id -ceq $article.id -or $row.slug -ceq $article.slug -or $row.source_url -ceq $article.source_url -or $row.url -ceq $article.url) { $matches[[string]$row.id] = $row }
        }
        if ($rows.Count -lt 100) { return @($matches.Values) }
    }
    throw 'No se pudo completar el inventario. Detencion.'
}
try {
    Write-Host 'No use transcripciones, grabacion ni depuracion de esta sesion.'
    $secure = Read-Host 'Ingrese personalmente el secreto interno (entrada oculta)' -AsSecureString
    if ($secure.Length -eq 0) { throw 'Credencial vacia. Detencion.' }
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $secret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    $probe = Invoke-Read "$worker/internal/articles?page=1&pageSize=1" $true
    Write-Host "GET interno: HTTP $($probe.Status)"
    if ($probe.Status -ne 200) { throw 'Autenticacion no validada. Sin POST.' }
    $collisions = @(Find-Collisions)
    if ($collisions.Count -ne 0) { throw "Existen $($collisions.Count) registros con ID, slug o URLs coincidentes. Sin POST." }
    Write-Host 'Cero colisiones en ID, slug, source_url y url.'
    $image = Invoke-Read $article.image_url $false
    if ($image.Status -ne 200) { throw "Imagen HTTP $($image.Status). Sin POST." }
    $request = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Post, "$worker/internal/articles/upsert")
    $response = $null
    try {
        [void]$request.Headers.TryAddWithoutValidation('x-internal-api-secret', $secret)
        $request.Content = [Net.Http.ByteArrayContent]::new($bytes)
        $request.Content.Headers.ContentType = [Net.Http.Headers.MediaTypeHeaderValue]::new('application/json')
        $posted = $true
        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        Write-Host "POST unico: HTTP $([int]$response.StatusCode)"
        $postStatus = [int]$response.StatusCode
    } catch { Write-Host 'POST con resultado ambiguo o timeout. No se repetira; se comprobara por lectura.' }
    finally { if ($response) { $response.Dispose() }; $request.Dispose() }
    $records = @(Find-Collisions)
    if ($records.Count -ne 1) { throw "Tras el POST se encontraron $($records.Count) registros coincidentes. No repetir este ejecutor; revisar mediante lectura." }
    $stored = $records[0]
    foreach ($field in @('id','slug','title','excerpt','summary','content','image_url','source_url','url','source_type','editorial_author','editorial_status','editorial_review_status','region','country','category','topic_slug','section_slug','language','impact_format')) {
        if ([string]$stored.$field -cne [string]$article.$field) { throw "Discrepancia en $field. No se realizara ninguna correccion." }
    }
    foreach ($field in @('countries','tags','is_impact','is_featured','editorial_sections','faq_items')) {
        if (($stored.$field | ConvertTo-Json -Compress -Depth 20) -cne ($article.$field | ConvertTo-Json -Compress -Depth 20)) { throw "Discrepancia en $field. Sin correcciones." }
    }
    if (($stored.raw.editorial_sources | ConvertTo-Json -Compress -Depth 20) -cne ($article.raw.editorial_sources | ConvertTo-Json -Compress -Depth 20)) { throw 'Fuentes almacenadas distintas. Sin correcciones.' }
    Write-Host 'Un unico registro; cuerpo integro, firma, estados, taxonomia, imagen y siete fuentes correctos.'
    $verified = $false
    for ($attempt = 1; $attempt -le 6; $attempt++) {
        $detail = Invoke-Read $publicUrl $false
        $impacto = Invoke-Read 'https://latamworldnews.com/impacto' $false
        $html = [Net.WebUtility]::HtmlDecode($detail.Body)
        $plain = [regex]::Replace($html, '<[^>]+>', ' ')
        $plain = [regex]::Replace($plain, '\s+', ' ')
        $valid = $detail.Status -eq 200 -and $impacto.Status -eq 200 -and $impacto.Body.Contains('/impacto/editorial/' + $article.slug) -and $html.Contains($article.image_url)
        foreach ($text in @($article.title, $article.excerpt, $article.editorial_author)) { if (-not $plain.Contains($text)) { $valid = $false } }
        foreach ($paragraph in ($article.content -split '\n\n')) {
            $paragraph = [regex]::Replace($paragraph, '^#{1,6}\s+', '').Replace('**', '')
            $paragraph = [regex]::Replace($paragraph, '\s+', ' ')
            if (-not $plain.Contains($paragraph)) { $valid = $false }
        }
        foreach ($source in $article.raw.editorial_sources) { if (-not $html.Contains($source.url)) { $valid = $false } }
        if ($valid) { $verified = $true; break }
        if ($attempt -lt 6) { Start-Sleep -Seconds 15 }
    }
    Write-Host "Detalle: HTTP $($detail.Status); Impacto: HTTP $($impacto.Status); imagen: HTTP $($image.Status)"
    if (-not $verified) { throw 'Registro comprobado, pero la verificacion publica no esta completa. Sin repetir POST ni corregir.' }
    Write-Host 'Publicacion verificada: contenido, imagen, siete fuentes y aparicion en Impacto.'
    Write-Host $publicUrl
} catch {
    if ($posted) { Write-Host 'Se intento UN POST. No volver a ejecutar sin comprobar primero el registro por lectura.' }
    Write-Host ('DETENCION: ' + $_.Exception.Message)
} finally {
    $secret = $null
    if ($secure) { $secure.Dispose() }
    $client.Dispose()
    $handler.Dispose()
}
