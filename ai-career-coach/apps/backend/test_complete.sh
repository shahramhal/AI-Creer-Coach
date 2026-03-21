#!/bin/bash

echo "========================================"
echo "COMPLETE END-TO-END TEST"
echo "========================================"

# Step 1: Login
echo -e "\n1️⃣ Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test1@example.com",
    "password": "SecurePass123!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | sed 's/"accessToken":"//;s/"//')
USER_ID=$(echo $LOGIN_RESPONSE | grep -o '"id":"[^"]*"' | sed 's/"id":"//;s/"//')

echo "✅ Logged in"
echo "User ID: $USER_ID"
echo "Token: ${TOKEN:0:20}..."

# Step 2: Upload CV to ML SERVICE (port 8000)
echo -e "\n2️⃣ Uploading CV to ML service..."
CV_RESPONSE=$(curl -s -X POST http://localhost:8000/api/ml/parse-cv \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@Shahram_Halimzoda_Software_Engineer.pdf")

echo "CV Upload Response:"
echo $CV_RESPONSE | python -m json.tool

# Step 3: Verify CV in MongoDB
echo -e "\n3️⃣ Checking MongoDB for CV..."
docker exec -it career_coach_mongodb mongosh \
  -u admin -p admin123 --authenticationDatabase admin \
  --eval "use career_coach; db.parsed_cvs.find({user_id: '$USER_ID'}, {user_id: 1, 'skills': 1}).pretty()"

# Step 4: Get job matches
echo -e "\n4️⃣ Getting job matches..."
MATCH_RESPONSE=$(curl -s -X POST http://localhost:4000/api/matching/find-jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"top_k": 5}')

echo "Match Response:"
echo $MATCH_RESPONSE | python -m json.tool

echo -e "\n========================================"
echo "TEST COMPLETE"
echo "========================================"