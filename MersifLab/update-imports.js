const fs = require('fs');
const path = require('path');

// Define the base directory
const baseDir = path.join(__dirname, 'src', 'js');

// Map of old import paths to new ones
const importMappings = {
    "../gemini-service": "./services/gemini-service",
    "../supabase-service": "./services/supabase-service",
    "../materials-service": "./services/materials-service",
    "../auth-service": "./services/auth-service",
    "../auth-ui": "./components/auth/auth-ui",
    "../auth-guard": "./components/auth/auth-guard"
};

// Process all JS files
function processDirectory(directory) {
    const files = fs.readdirSync(directory, { withFileTypes: true });
    
    files.forEach(file => {
        const fullPath = path.join(directory, file.name);
        
        if (file.isDirectory()) {
            processDirectory(fullPath);
        } else if (file.name.endsWith('.js')) {
            updateImports(fullPath);
        }
    });
}

// Update imports in a single file
function updateImports(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    // Update import/require statements
    for (const [oldPath, newPath] of Object.entries(importMappings)) {
        const importRegex = new RegExp(`(import\s+.*\s+from\s+['"])${oldPath}(['"])`, 'g');
        const requireRegex = new RegExp(`(require\s*\(\s*['"])${oldPath}(['"]\s*\))`, 'g');
        
        if (importRegex.test(content) || requireRegex.test(content)) {
            content = content
                .replace(importRegex, `$1${newPath}$2`)
                .replace(requireRegex, `$1${newPath}$2`);
            updated = true;
        }
    }
    
    // Save if changes were made
    if (updated) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated imports in ${path.relative(process.cwd(), filePath)}`);
    }
}

// Start processing from the base JS directory
processDirectory(baseDir);
console.log('Import updates complete!');
