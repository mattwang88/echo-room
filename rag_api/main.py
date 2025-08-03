from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.document_loaders import TextLoader, CSVLoader, PyPDFLoader, Docx2txtLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Dict, List, Optional
import os
import tempfile
import uuid
import shutil

# Session management for user-uploaded documents
session_indexes: Dict[str, FAISS] = {}
embedding_model = None

# Load documents according to extension
def load_documents(filepaths: List[str]):
    """
    Returns a list of langchain document objects
    """
    loaded_docs = []
    for filepath in filepaths:
        ext = os.path.splitext(filepath)[1].lower()
        if ext in ['.txt', '.md']:
            loader = TextLoader(filepath)
        elif ext == '.csv':
            loader = CSVLoader(filepath)
        elif ext == '.pdf':
            loader = PyPDFLoader(filepath)
        elif ext == '.docx':
            loader = Docx2txtLoader(filepath)
        else:
            print(f"Skipping unsupported file type: {filepath}")
            continue

        try:
            docs = loader.load()
            loaded_docs.extend(docs)
        except Exception as e:
            print(f"Failed to load {filepath}: {e}")
    
    return loaded_docs

def create_faiss_index_from_documents(documents: List, session_id: str):
    """
    Create a new FAISS index from uploaded documents
    """
    global embedding_model
    
    if not documents:
        raise ValueError("No documents provided")
    
    # Process documents into chunks
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunked_docs = text_splitter.split_documents(documents)
    
    # Create FAISS index
    faiss_index = FAISS.from_documents(chunked_docs, embedding_model)
    
    # Store in session
    session_indexes[session_id] = faiss_index
    
    return faiss_index


PROJECT_ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = PROJECT_ROOT / "faiss_index"
faiss_index = None

class QueryRequest(BaseModel):
    query: str
    top_k: int = 3
    session_id: Optional[str] = None

class UploadResponse(BaseModel):
    session_id: str
    message: str
    document_count: int

@asynccontextmanager
async def lifespan(app: FastAPI):
    global faiss_index, embedding_model
    embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    try:
        faiss_index = FAISS.load_local(str(INDEX_PATH), embedding_model, allow_dangerous_deserialization=True)
        print("FAISS index loaded")
    except Exception as e:
        print(f"Failed to load FAISS index: {e}")
        
    # --- Startup complete ---
    yield

    # --- Shutdown cleanup ---
    print("Shutting down: releasing FAISS index from memory")
    faiss_index = None
    session_indexes.clear()

app = FastAPI(lifespan=lifespan)

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can specify your frontend URL here in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/upload", response_model=UploadResponse)
async def upload_documents(files: List[UploadFile] = File(...)):
    """
    Upload documents and create a new session-specific FAISS index
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # Generate unique session ID
    session_id = str(uuid.uuid4())
    print(f"[upload] New session created: {session_id}")
    
    # Create temporary directory for uploaded files
    temp_dir = tempfile.mkdtemp()
    print(f"[upload] Temp directory created: {temp_dir}")
    uploaded_files = []
    
    try:
        # Save uploaded files to temporary directory
        for file in files:
            if not file.filename:
                continue
                
            file_path = os.path.join(temp_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            uploaded_files.append(file_path)
        
        # Load documents
        documents = load_documents(uploaded_files)
        
        if not documents:
            raise HTTPException(status_code=400, detail="No valid documents found")
        
        # Create FAISS index for this session
        create_faiss_index_from_documents(documents, session_id)
        
        return UploadResponse(
            session_id=session_id,
            message=f"Successfully processed {len(documents)} documents",
            document_count=len(documents)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process documents: {str(e)}")
    finally:
        # Clean up temporary files
        for file_path in uploaded_files:
            try:
                os.remove(file_path)
            except:
                pass
        try:
            os.rmdir(temp_dir)
            print(f"[upload] Temp directory deleted: {temp_dir}")
        except Exception as e:
            print(f"[upload] Failed to delete temp directory: {temp_dir} — {e}")

@app.post("/retrieve")
def retrieve_documents(request: QueryRequest):
    """
    Retrieve documents from either the default index or a session-specific index
    """

    print(f"[retrieve] Incoming request — query: '{request.query}', session_id: '{request.session_id}', top_k: {request.top_k}")

    # Determine which index to use
    if request.session_id and request.session_id in session_indexes:
        # Use session-specific index
        index_to_use = session_indexes[request.session_id]
        print(f"[retrieve] Using session-specific index: {request.session_id}")
    elif faiss_index is not None:
        # Use default index
        index_to_use = faiss_index
        print("[retrieve] Using default global index")
    else:
        raise HTTPException(status_code=500, detail="No FAISS index available")

    try:
        top_chunks = index_to_use.similarity_search(request.query, k=request.top_k)
        results = [chunk.page_content for chunk in top_chunks]
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/session/{session_id}")
def delete_session(session_id: str):
    """
    Delete a session and its associated FAISS index
    """
    if session_id in session_indexes:
        del session_indexes[session_id]
        print(f"[session] Session deleted: {session_id}")
        return {"message": f"Session {session_id} deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="Session not found")

# This is for POST to delete session when page is closed or reloaded
@app.post("/session/clear/{session_id}")
def clear_session_post(session_id: str):
    """
    Clear session via POST (for use with sendBeacon)
    """
    if session_id in session_indexes:
        del session_indexes[session_id]
        print(f"[session] (via POST) Session deleted: {session_id}")
        return {"message": f"Session {session_id} deleted via POST"}
    else:
        raise HTTPException(status_code=404, detail="Session not found")

@app.get("/sessions")
def list_sessions():
    """
    List all active sessions
    """
    return {"active_sessions": list(session_indexes.keys())}

