import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Extract files from the form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    // 2. Validate that files were uploaded
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      );
    }

    // 3. Define allowed document types
    const allowedTypes = [
      'text/plain',           // .txt files
      'text/markdown',        // .md files
      'text/csv',             // .csv files
      'application/pdf',      // .pdf files
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx files
    ];

    // 4. Validate each file
    for (const file of files) {
      // Check if file type is in our allowed list OR if filename has correct extension
      const isValidType = allowedTypes.includes(file.type) || 
                         file.name.match(/\.(txt|md|csv|pdf|docx)$/i);
      
      if (!isValidType) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.name}. Supported types: txt, md, csv, pdf, docx` },
          { status: 400 }
        );
      }

      // Check file size (max 10MB per file)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ${file.name} is too large. Maximum size is 10MB.` },
          { status: 400 }
        );
      }
    }

    // 5. Prepare files for RAG API
    const ragFormData = new FormData();
    files.forEach(file => {
      ragFormData.append('files', file);
    });

    // 6. Send files to RAG API
    const ragResponse = await fetch('http://localhost:8000/upload', {
      method: 'POST',
      body: ragFormData,
    });

    // 7. Handle RAG API response
    if (!ragResponse.ok) {
      const errorText = await ragResponse.text();
      console.error('RAG API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to process documents' },
        { status: 500 }
      );
    }

    // 8. Extract data from RAG API response
    const ragData = await ragResponse.json();

    // 9. Return success response with session information
    return NextResponse.json({
      success: true,
      session_id: ragData.session_id,
      message: ragData.message,
      document_count: ragData.document_count
    });

  } catch (error) {
    // 10. Handle any unexpected errors
    console.error('Error uploading documents:', error);
    return NextResponse.json(
      { error: 'Error uploading documents' },
      { status: 500 }
    );
  }
} 