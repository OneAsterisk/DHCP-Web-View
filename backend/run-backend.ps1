Write-Host "Starting DHCP Web View Backend..." -ForegroundColor Green
Write-Host ""
Write-Host "Installing dependencies if needed..." -ForegroundColor Yellow
npm install
Write-Host ""
Write-Host "Starting backend server in development mode..." -ForegroundColor Green
npm run dev
