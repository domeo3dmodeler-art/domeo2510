$body = @{
    models = @('DomeoDoors_Base_1', 'DomeoDoors_Atom_4', 'DomeoDoors_Gabriel_1')
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://130.193.40.35:3001/api/catalog/doors/photos-batch" -Method Post -Headers @{"Content-Type"="application/json"} -Body $body -UseBasicParsing

Write-Host "Response:"
Write-Host $response.Content
