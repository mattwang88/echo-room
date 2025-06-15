import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const imagesDir = join(process.cwd(), 'public/images');
    const files = await readdir(imagesDir);
    
    // Filter for image files and exclude user-uploaded images
    const avatars = files.filter(file => {
      const isImage = /\.(jpg|jpeg|png|gif)$/i.test(file);
      const isPredefined = !file.startsWith('user-');
      return isImage && isPredefined;
    });

    return NextResponse.json({ avatars });
  } catch (error) {
    console.error('Error reading avatars directory:', error);
    return NextResponse.json(
      { error: 'Failed to load avatars' },
      { status: 500 }
    );
  }
} 