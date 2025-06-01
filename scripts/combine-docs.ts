// scripts/combine-docs.ts
import { promises as fs } from 'fs';
import * as path from 'path';

const docsFolder = path.resolve(process.cwd(), 'internal_docs');
const outputFile = path.resolve(process.cwd(), 'internal_docs_combined.txt');

async function combineMarkdownFiles() {
  try {
    const filenames = await fs.readdir(docsFolder);
    const mdFiles = filenames.filter(name => name.endsWith('.md'));

    const contents = await Promise.all(
      mdFiles.map(name => fs.readFile(path.join(docsFolder, name), 'utf-8'))
    );

    const combined = contents.join('\n\n---\n\n');
    await fs.writeFile(outputFile, combined, 'utf-8');

    console.log(`✅ Combined ${mdFiles.length} docs into ${outputFile}`);
  } catch (err) {
    console.error('❌ Failed to combine docs:', err);
  }
}

combineMarkdownFiles();
