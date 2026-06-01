from backend.main import app

# This exports the FastAPI instance to Vercel Serverless environment.
# All routes are modularized inside the backend package.
__all__ = ["app"]
