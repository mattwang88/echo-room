from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from pathlib import Path
from contextlib import asynccontextmanager
import os

PROJECT_ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = PROJECT_ROOT / "faiss_index"
faiss_index = None

class QueryRequest(BaseModel):
    query: str
    top_k: int = 3

@asynccontextmanager
async def lifespan(app: FastAPI):
    global faiss_index
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

app = FastAPI(lifespan=lifespan)

@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/retrieve")
def retrieve_documents(request: QueryRequest):
    if faiss_index is None:
        raise HTTPException(status_code=500, detail="FAISS index not loaded")

    try:
        top_chunks = faiss_index.similarity_search(request.query, k=request.top_k)
        results = [chunk.page_content for chunk in top_chunks]
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
