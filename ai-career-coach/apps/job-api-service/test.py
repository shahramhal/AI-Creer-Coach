# Test script: test_adzuna.py
import requests

APP_ID = "23d86cb2"
APP_KEY = "39dc08bf1ba512e11f6fc799290142ba"



url = "https://api.adzuna.com/v1/api/jobs/gb/search/1"
params = {
    'app_id': APP_ID,
    'app_key': APP_KEY,
    'results_per_page': 10,
    'what': 'python developer',
    'where': 'london'
}

response = requests.get(url, params=params)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
# ```

# ---

# ## Connection Cheat Sheet

# ### **When running services:**

# | Service Location | MongoDB URL | PostgreSQL URL | Redis URL |
# |-----------------|-------------|----------------|-----------|
# | **Inside Docker** | `mongodb://admin:admin123@mongodb:27017/...` | `postgresql://postgres:Komron06@postgres:5432/...` | `redis://redis:6379` |
# | **Localhost (outside Docker)** | `mongodb://admin:admin123@localhost:27017/...` | `postgresql://postgres:Komron06@localhost:5432/...` | `redis://localhost:6379` |

# ### **Your current setup:**
# ```
#  Running in Docker:
#    - postgres (accessible at localhost:5432)
#    - mongodb (accessible at localhost:27017)
#    - redis (accessible at localhost:6379)
#    - ml-service (port 8000)

# 🏠 Running locally:
#    - frontend (port 3000)
#    - backend (port 4000)
#    - job-api-service (port 8001) ← This one has MongoDB connection issue