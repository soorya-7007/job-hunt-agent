import sys
import os

# Ensure app is in path if run directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from mcp.server.mcpserver import MCPServer
from app.tools.job_boards import search_jobs

# Initialize MCP server
mcp = MCPServer("JobHuntAgent")

@mcp.tool()
def search_for_jobs(query: str, location: str = "", limit: int = 10) -> str:
    """Search for real job postings using the JobHunt Agent's job boards integration.
    
    Args:
        query: The job title, skills, or role to search for (e.g. 'Python Developer')
        location: The location to search in (e.g. 'Remote', 'New York'). Defaults to anywhere.
        limit: Maximum number of results to return. Defaults to 10.
        
    Returns:
        A formatted string of job postings.
    """
    try:
        jobs = search_jobs(query, location, limit)
        if not jobs:
            return "No jobs found for the given query."
            
        result = [f"Found {len(jobs)} jobs:"]
        for j in jobs:
            result.append(f"\n--- {j.title} at {j.company} ---")
            result.append(f"Location: {j.location}")
            if j.salary:
                result.append(f"Salary: {j.salary}")
            result.append(f"URL: {j.url}")
            # Keep description brief
            desc = j.description[:300] + "..." if len(j.description) > 300 else j.description
            result.append(f"Description: {desc}")
            
        return "\n".join(result)
    except Exception as e:
        return f"Error searching for jobs: {str(e)}"

if __name__ == "__main__":
    mcp.run()
