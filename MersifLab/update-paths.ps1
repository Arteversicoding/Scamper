# Update paths in HTML files
$htmlFiles = Get-ChildItem -Path "src\pages" -Recurse -Filter "*.html" -File

foreach ($file in $htmlFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    
    # Update script src paths
    $content = $content -replace 'src="([^"]*\)?([^/"\]+\.js)"', 'src="/src/js/pages/$2"'
    $content = $content -replace 'src="js/([^"]+\.js)"', 'src="/src/js/pages/$1"'
    
    # Update CSS paths
    $content = $content -replace 'href="([^"]*\)?([^/"\]+\.css)"', 'href="/src/styles/$2"'
    
    # Update image paths
    $content = $content -replace 'src="([^"]*\\)?assets/images/([^"]+)"', 'src="/src/assets/images/$2"'
    
    # Save the updated content
    $content | Set-Content -Path $file.FullName -NoNewline
    
    Write-Host "Updated paths in $($file.FullName)"
}

# Update paths in JavaScript files
$jsFiles = Get-ChildItem -Path "src\js" -Recurse -Filter "*.js" -File

foreach ($file in $jsFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    
    # Update import paths
    $content = $content -replace 'from "\.\./\.\./([^"]+)"', 'from "../../$1"'
    $content = $content -replace 'from "\.\./([^"]+)"', 'from "../$1"'
    $content = $content -replace 'from "([^"]*\\)?([^/"\]+\.js)"', 'from "../../$2"'
    
    # Save the updated content
    $content | Set-Content -Path $file.FullName -NoNewline
    
    Write-Host "Updated paths in $($file.FullName)"
}

Write-Host "Path updates complete!"
