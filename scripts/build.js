import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientSrcDir = path.join(__dirname, '../src/client');
const publicDir = path.join(__dirname, '../public');
const vendorDir = path.join(publicDir, 'vendor');
const nodeModulesDir = path.join(__dirname, '../node_modules');

async function build() {
    console.log('Starting build process...');

    try {
        // --- Build client source files ---
        console.log('\nProcessing client source files...');
        const files = await fs.readdir(clientSrcDir);
        const jsFiles = files.filter(file => file.endsWith('.js'));
        console.log(`Found ${jsFiles.length} JavaScript files to process.`);

        for (const file of jsFiles) {
            const srcPath = path.join(clientSrcDir, file);
            const destPath = path.join(publicDir, file);
            let content = await fs.readFile(srcPath, 'utf-8');
            content = content.replace(/from ('|")\.\.\/\.\.\/src\/shared\/(.*)('| ")/g, 'from \'/shared/$2\'');
            content = content.replace(/from ('|")\.\.\/\.\.\/public\/(.*)('| ")/g, 'from \'./$2\'');
            await fs.writeFile(destPath, content, 'utf-8');
            console.log(`- Transformed: ${file}`);
        }

        // --- Copy vendor libraries ---
        console.log('\nProcessing vendor libraries...');
        await fs.mkdir(vendorDir, { recursive: true });

        const chartJsSrc = path.join(nodeModulesDir, 'chart.js/dist/chart.umd.js');
        const chartJsDest = path.join(vendorDir, 'chart.js');
        await fs.copyFile(chartJsSrc, chartJsDest);
        console.log('- Copied: chart.js');

        // --- Copy shared files for static serving on Vercel ---
        console.log('\nProcessing shared files...');
        const sharedSrcDir = path.join(__dirname, '../src/shared');
        const sharedDestDir = path.join(publicDir, 'shared');
        await fs.mkdir(sharedDestDir, { recursive: true });
        const sharedFiles = await fs.readdir(sharedSrcDir);
        const sharedJsFiles = sharedFiles.filter(file => file.endsWith('.js') && !file.endsWith('.test.js') && !file.endsWith('.spec.js'));
        for (const file of sharedJsFiles) {
            const srcPath = path.join(sharedSrcDir, file);
            const destPath = path.join(sharedDestDir, file);
            await fs.copyFile(srcPath, destPath);
            console.log(`- Copied shared: ${file}`);
        }

        console.log('\nBuild process completed successfully!');

    } catch (error) {
        console.error('An error occurred during the build process:', error);
        process.exit(1); // Exit with an error code
    }
}

build();