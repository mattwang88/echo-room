# Document Retrieval

### Requirements
pip install fastapi uvicorn langchain-community langchain-huggingface sentence-transformers

## How it works for now
There is a saved FAISS index in the root. When the user sends a message in the chat, the function src/lib/fetchInternalKnowledge.ts 
is called and a request is made through the API 
rag_api/main.py
to search for relevant chunks of text in the index and return them as context for the agent.

The API needs to be run locally, to do so run
uvicorn rag_api.main:app --reload


## To do
- First thing to do, the idea would be to make the upload button functional so that when the user uploads docs, a new temporary faiss index is created and it will be the one which is queried. This comes with setting a session associated with the given faiss index so that when the user is done with the meeting, the index is deleted from memory. 
If the user does not upload any documents, the faiss index will be the default one

- Eventually the API needs to be hosted somewhere

- Eventually we would like a storage where the user has some control of the docs there so that they stay permanent across sessions

