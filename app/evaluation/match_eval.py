import sys
import os

# Ensure app is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.schemas import CandidateProfile, JobPosting
from app.agents.matching_agent import match_jobs

def main():
    print("Running Match Evaluation...")
    
    # 1. Mock Profile (Python Backend Developer)
    profile = CandidateProfile(
        id="cand_1",
        name="Test User",
        skills=["python", "fastapi", "sql", "docker", "aws"],
        experience=["Backend Engineer", "Software Developer"],
        locations=["Remote"],
        work_mode="remote",
        salary_range="100k-150k"
    )

    # 2. Mock Jobs
    jobs = [
        JobPosting(
            id="job_1", title="Senior Python Engineer", company="TechCorp", location="Remote",
            description="We need a strong Python developer with FastAPI and SQL experience to build our APIs. Docker is a plus.",
            url="http://example.com/job1", source="mock", fetched_at="2026-01-01"
        ),
        JobPosting(
            id="job_2", title="Frontend React Developer", company="WebInc", location="New York",
            description="Looking for a React developer with strong CSS and JavaScript skills. No backend needed.",
            url="http://example.com/job2", source="mock", fetched_at="2026-01-01"
        ),
        JobPosting(
            id="job_3", title="Data Engineer", company="DataSystems", location="Remote",
            description="Requires Python, SQL, and AWS. Build data pipelines.",
            url="http://example.com/job3", source="mock", fetched_at="2026-01-01"
        )
    ]

    # Ground truth order should roughly be: job_1 (Best), job_3 (Good), job_2 (Bad)
    print("Evaluating Matching Agent...")
    results = match_jobs(profile, jobs)

    print("\n--- Match Results ---")
    for r in results:
        print(f"[{r.score}/100] {r.job.title} at {r.job.company}")
        if r.gaps:
            print(f"  Gaps: {', '.join(r.gaps)}")
    
    # Check assertions for basic logic
    assert results[0].job.id in ["job_1", "job_3"], "Best match should be Python or Data Engineer"
    assert results[-1].job.id == "job_2", "Worst match should be Frontend"
    print("\n✅ Match Evaluation Passed: Agent ranked jobs correctly according to skill overlap.")

if __name__ == "__main__":
    main()
