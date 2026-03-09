import fs from 'fs';
import path from 'path';

const nextDir = path.resolve(process.cwd(), '.next');

try {
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log('[predev] Cleared .next cache to avoid readlink cache corruption issues on Windows/OneDrive.');
  }
} catch (error) {
  console.warn('[predev] Could not clear .next cache:', error?.message || error);
}
