# check_routes.py
"""
Check what routes are registered in the ML service
"""

from main import app


print("REGISTERED ROUTES IN ML SERVICE")


for route in app.routes:
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        methods = ','.join(route.methods) if route.methods else 'N/A'
        print(f"{methods:10} {route.path}")

