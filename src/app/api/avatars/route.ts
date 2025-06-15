import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const categories = ['avatars', 'females', 'males'];
  const allImages: string[] = [];

  try {
    for (const category of categories) {
      const imagesDir = path.join(process.cwd(), 'public', 'images', category);
      if (fs.existsSync(imagesDir)) {
        const files = fs.readdirSync(imagesDir);
        const imageFiles = files.filter(file => 
          file.toLowerCase().endsWith('.png') || 
          file.toLowerCase().endsWith('.jpg') || 
          file.toLowerCase().endsWith('.jpeg')
        );
        // Add category prefix to each image path
        allImages.push(...imageFiles.map(file => `${category}/${file}`));
      }
    }

    return NextResponse.json(allImages);
  } catch (error) {
    console.error('Error reading avatars directory:', error);
    return NextResponse.json({ error: 'Failed to read avatars' }, { status: 500 });
  }
} 