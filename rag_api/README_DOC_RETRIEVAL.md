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

### Update
Now the user can upload documents on the scenario generation page. When documents are uploaded, a session id is created and associated to a faiss_index generated from the uploaded docs. This index is the one used for retrieval. If the user does not upload docs, the default faiss index will be used.

A session is cleared when the user "clears" the document upload selection or ends the meeting, alternatively when the page is navigated away from, reloaded or closed.
PROBLEM TO FIX: in the meeting page, upon reload, the meeting restarts. Hence it would be good to not clear the session upon reload here, to preserve the user-uploaded context.


## To do
- Eventually the API needs to be hosted somewhere

- Eventually we would like a storage where the user has some control of the docs there so that they stay permanent across sessions

