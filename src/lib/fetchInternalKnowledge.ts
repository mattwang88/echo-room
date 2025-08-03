// Function to request to rag api
export async function fetchInternalKnowledge(query: string, topK: number = 3, sessionId?: string): Promise<string> {
    console.log("📣 fetchInternalKnowledge called with:", query);
    // Start a try block in case something goes wrong (e.g., server is down)
    try {
      const body = {
        query,
        top_k: topK,
        ...(sessionId ? { session_id: sessionId } : {})  // Include session_id only if defined
      };

      // Send a POST request to your FastAPI server at /retrieve
      const response = await fetch("http://localhost:8000/retrieve", {
        method: "POST",  // We're sending data
        headers: {
          "Content-Type": "application/json",  // We're sending JSON
        },
        body: JSON.stringify(body),  // Convert our input to JSON
      });
  
      // If the server gives back an error (not 200 OK), handle it
      if (!response.ok) {
        console.error("Failed to fetch internal knowledge:", await response.text());
        return '';  // Return an empty string if it fails
      }
  
      // If it worked, convert the JSON response into a JavaScript object
      const data = await response.json();
  
      // The data looks like: { results: ["chunk1", "chunk2", "chunk3"] }
      // Join the results together into one big string
      return data.results.join('\n\n');
    } catch (error) {
      // This catches network errors or other failures
      console.error("Error calling FastAPI backend:", error);
      return '';
    }
  }