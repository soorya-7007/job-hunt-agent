"""Autofill Agent: Uses Playwright to navigate to a job application and fill standard fields.

This is a proof-of-concept for Stretch Goal 3. It targets generic fields like
First Name, Last Name, and Email. To comply with the Responsible AI guardrail, 
it explicitly avoids clicking any "Submit" buttons.
"""
from typing import Optional
from app.schemas import CandidateProfile

def attempt_autofill(profile: CandidateProfile, url: str) -> Optional[str]:
    """Navigates to URL, fills the form using profile data, and returns a base64 screenshot."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("[autofill_agent] Playwright not installed. Skipping.")
        return None

    if not url or not url.startswith("http"):
        return None

    screenshot_path = "data/cache/autofill_latest.png"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 1024})
        page = context.new_page()
        
        try:
            # Navigate to the job page
            page.goto(url, wait_until="domcontentloaded", timeout=15000)
            
            # Very basic heuristic form filling (Greenhouse/Lever-like structures)
            name_parts = (profile.name or "Candidate").split()
            first_name = name_parts[0] if name_parts else "Candidate"
            last_name = name_parts[-1] if len(name_parts) > 1 else ""
            
            # Fill First Name
            for selector in ["input[name*='first']", "input[id*='first']", "input[placeholder*='First']"]:
                try:
                    if page.locator(selector).is_visible(timeout=500):
                        page.locator(selector).fill(first_name)
                        break
                except:
                    pass
                    
            # Fill Last Name
            for selector in ["input[name*='last']", "input[id*='last']", "input[placeholder*='Last']"]:
                try:
                    if page.locator(selector).is_visible(timeout=500):
                        page.locator(selector).fill(last_name)
                        break
                except:
                    pass
                    
            # Fill Email
            email = "candidate@example.com" # Mock email since profile schema doesn't have it explicitly
            for selector in ["input[type='email']", "input[name*='email']"]:
                try:
                    if page.locator(selector).is_visible(timeout=500):
                        page.locator(selector).fill(email)
                        break
                except:
                    pass
            
            # Take a screenshot to prove we filled it without submitting
            page.screenshot(path=screenshot_path, full_page=True)
            
            # Convert screenshot to base64 to display in the UI
            import base64
            with open(screenshot_path, "rb") as f:
                encoded = base64.b64encode(f.read()).decode("utf-8")
                return f"data:image/png;base64,{encoded}"
                
        except Exception as exc:
            print(f"[autofill_agent] Error during automation: {exc}")
            return None
        finally:
            browser.close()
