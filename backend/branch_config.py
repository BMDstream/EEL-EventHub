# Branch-level environment configuration
# On the preview branch, this ensures that the backend serverless runtime,
# even when system environment variables or file-based configs are not passed by Vercel,
# unconditionally connects to neondb_preview rather than production neondb.

IS_PREVIEW = True
BRANCH_NAME = "preview"
