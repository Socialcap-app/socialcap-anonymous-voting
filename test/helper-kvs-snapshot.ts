
import { readdirSync, unlinkSync, copyFileSync } from 'fs';
import { join, resolve } from 'path';

function syncFolders(targetFolder: string, sourceFolder: string) {
    const targetFolderPath = resolve(targetFolder);
    const sourceFolderPath = resolve(sourceFolder);

    // Delete all files in the target folder
    const targetFiles = readdirSync(targetFolderPath);
    targetFiles.forEach(file => {
        unlinkSync(join(targetFolderPath, file));
    });

    // Copy all files from the source folder to the target folder
    const sourceFiles = readdirSync(sourceFolderPath);
    sourceFiles.forEach(file => {
        copyFileSync(join(sourceFolderPath, file), join(targetFolderPath, file));
    });
}

function copySnapshot(name: string) {
  syncFolders('./kvstorage', `./test/${name}`)
}

export { copySnapshot } ;