$url = "http://130.193.40.35:3001/api/uploads/products/cmg50xcgs001cv7mn0tdyk1wo/1761624856396_3d6cz0_d5.png"
$response = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing
Write-Host "Status: $($response.StatusCode)"
Write-Host "Content-Type: $($response.Headers['Content-Type'])"
