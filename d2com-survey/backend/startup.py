"""
Startup script — replaces start.sh to avoid CRLF/line-ending issues on Windows→Linux deploy.
Runs: service account setup → alembic migrations → seed → frontend build → uvicorn
"""

import os
import sys
import subprocess

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def run(cmd, cwd=None, fatal=True):
    """Run a command, print output, optionally exit on failure."""
    print(f"  → {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    if result.returncode != 0:
        if fatal:
            print(f"  ✗ Command failed (exit {result.returncode})")
            sys.exit(result.returncode)
        else:
            print(f"  ⚠️ Command had issues (exit {result.returncode}), continuing...")


def main():
    print("=== D2Com Survey Starting ===")

    # Write service account JSON from env var to file (if provided)
    sa_json = os.environ.get("GDRIVE_SERVICE_ACCOUNT_JSON", "")
    if sa_json:
        with open("/app/service-account.json", "w") as f:
            f.write(sa_json)
        os.environ["GDRIVE_SERVICE_ACCOUNT_FILE"] = "/app/service-account.json"
        print("✅ Service account file created from env var")

    # Seed database (create_all is handled in main.py lifespan)
    db_url = os.environ.get("DATABASE_URL", "")
    if db_url:
        print("🌱 Seeding database...")
        run("python -m backend.db.seed", cwd="/app", fatal=False)
        print("✅ Seed complete")
    else:
        print("⚠️ DATABASE_URL not set, skipping seed")

    # Start uvicorn
    port = os.environ.get("PORT", "8000")
    print(f"🚀 Starting server on port {port}...")
    os.execvp("uvicorn", [
        "uvicorn", "backend.main:app",
        "--host", "0.0.0.0",
        "--port", port,
        "--workers", "1",
        "--log-level", "info",
    ])


if __name__ == "__main__":
    main()
