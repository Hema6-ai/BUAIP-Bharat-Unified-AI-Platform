#!/usr/bin/env pwsh
# Generate translation dictionaries for all major Indian languages

Write-Host "`n🌍 BUAIP Multi-Language Translation Generator" -ForegroundColor Cyan
Write-Host "==========================================`n" -ForegroundColor Cyan

# List of languages to generate (prioritizing Indian languages)
$languages = @(
    @{Code="bn"; Name="Bengali / বাংলা"},
    @{Code="mr"; Name="Marathi / मराठी"},
    @{Code="gu"; Name="Gujarati / ગુજરાતી"},
    @{Code="kn"; Name="Kannada / ಕನ್ನಡ"},
    @{Code="ml"; Name="Malayalam / മലയാളം"},
    @{Code="pa"; Name="Punjabi / ਪੰਜਾਬੀ"},
    @{Code="ur"; Name="Urdu / اردو"}
)

Write-Host "📋 Languages to generate:" -ForegroundColor Yellow
foreach ($lang in $languages) {
    Write-Host "  • $($lang.Code): $($lang.Name)"
}
Write-Host ""

$confirm = Read-Host "Continue? This will use AWS Translate API (costs apply) [y/N]"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "❌ Cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
$successCount = 0
$failCount = 0

foreach ($lang in $languages) {
    Write-Host "🔄 Generating $($lang.Code) ($($lang.Name))..." -ForegroundColor Cyan
    
    try {
        tsx scripts/generateTranslations.ts $lang.Code
        $successCount++
        Write-Host ""
    } catch {
        Write-Host "❌ Failed to generate $($lang.Code)" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        $failCount++
        Write-Host ""
    }
}

Write-Host "`n=========================================="
Write-Host "✅ Success: $successCount | ❌ Failed: $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "`n📝 Next steps:"
Write-Host "1. Review generated files in app/i18n/"
Write-Host "2. Update app/i18n/index.ts to import new translations"
Write-Host "3. Test language switching in the UI"
Write-Host ""
