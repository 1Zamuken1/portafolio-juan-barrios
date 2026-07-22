import json
import urllib.request
import urllib.parse
import sys

def seed_projects():
    json_path = 'src/assets/data/projects.json'
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            projects = json.load(f)
    except Exception as e:
        print(f"Error reading {json_path}: {e}")
        return

    url = 'http://localhost:8080/api/projects'
    
    # We will get a token if needed, but GET /api/projects doesn't need it. 
    # WAIT, POST /api/projects DOES need a token!
    
    # First, login to get token
    login_url = 'http://localhost:8080/api/auth/login'
    login_data = json.dumps({"username": "admin", "password": "password123"}).encode('utf-8')
    req = urllib.request.Request(login_url, data=login_data, headers={'Content-Type': 'application/json'})
    
    try:
        response = urllib.request.urlopen(req)
        res_body = json.loads(response.read())
        token = res_body.get('token')
        print("Logged in successfully, got token.")
    except Exception as e:
        print(f"Failed to login: {e}")
        return

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }

    for p in projects:
        # Transform the frontend model from the JSON into the backend model
        payload = {
            "name": p.get("name"),
            "shortDescription": p.get("shortDescription"),
            "fullDescription": p.get("fullDescription"),
            "role": p.get("role", "Developer"),
            "year": p.get("year", 2024),
            "status": p.get("status", "Completed"),
            "technologies": p.get("technologies", []),
            "features": p.get("features", []),
            "highlights": p.get("highlights", []),
            "githubUrl": p.get("links", {}).get("github", ""),
            "liveUrl": p.get("links", {}).get("live", ""),
            "imageUrl": p.get("image", ""),
            "displayOrder": 0
        }
        
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers)
        try:
            response = urllib.request.urlopen(req)
            print(f"Successfully seeded: {p.get('name')}")
        except urllib.error.HTTPError as e:
            print(f"Failed to seed {p.get('name')}: {e.code} {e.reason}")
            print(e.read().decode())
        except Exception as e:
            print(f"Failed to seed {p.get('name')}: {e}")

if __name__ == '__main__':
    seed_projects()
