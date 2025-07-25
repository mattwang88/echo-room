import os
from langchain_community.document_loaders import TextLoader, CSVLoader, PyPDFLoader, Docx2txtLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
import google.generativeai as genai
from dotenv import load_dotenv

# Load vars from .env file
load_dotenv()

gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables.")
genai.configure(api_key=gemini_api_key)

# Get all filepaths in folder with given extensions
# If extensions is None, grab all files
def get_filepaths(folder_path, extensions=None):
    files = []
    for root, dirs, filenames in os.walk(folder_path):
        for file in filenames:
            if extensions is None or os.path.splitext(file)[1].lower() in extensions:
                files.append(os.path.join(root, file))
    return files

folder = "test_docs"
all_files = get_filepaths(folder)
print(f"Fetched {len(all_files)} filepaths")

# Load documents according to extension
def load_documents(filepaths):
    """
    filepaths: a list of strings
    returns a list of document objects
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

# Load all files in folder
all_docs = load_documents(all_files)
print(f"Loaded {len(all_docs)} documents")


# Chunking docs, chunk size is in chars
text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunked_docs = text_splitter.split_documents(all_docs)
print(f"Split into {len(chunked_docs)} chunks")

# Embedding
embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# Vector store
faiss_index = FAISS.from_documents(chunked_docs, embedding_model)
faiss_index.save_local("faiss_index")

# Querying gemini
def generate_answer_with_gemini(query, faiss_index, top_k=3):
    top_chunks = faiss_index.similarity_search(query, k=top_k)
    context = "\n\n".join([chunk.page_content for chunk in top_chunks])
    
    prompt = f"""
    Use the context below to help answer the question if possible. 
    Otherwise, answer the question as best as you can based on your general knowledge.
    Do NOT mention whether the context is relevant or not; just answer naturally.

    Context:
    {context}

    Question: {query}
    Answer:
    """
    
    gen_model = genai.GenerativeModel("gemini-1.5-flash")
    response = gen_model.generate_content(prompt)
    return response.text.strip()

# Example usage:
query_1 = "What happens during the employee onboarding process?"
query_2 = "What is a chicken?"
query_3 = "Can you give me the email of the sales rep?"

def ask_gem(query):
    print(f"Question:\n{query}")
    print(f"Gemini's answer:\n{generate_answer_with_gemini(query, faiss_index)}")
    return

ask_gem(query_3)




