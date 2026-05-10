#!/bin/bash
ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc2MTY3MDQ4LCJleHAiOjIwOTE1MjcwNDh9.Q_vuhw2vPR8OTW7xD8Zc_HEsyI5d9S40jBtmghIuG3I'
SERVICE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzYxNjcwNDgsImV4cCI6MjA5MTUyNzA0OH0.hNJldeNhwYajzTVq0ElvaOH_5akl_wcFGbVHIrJ_Ydg'

# 1. Create auth user
echo "Creating auth user..."
RESULT=$(curl -s -X POST http://supabase-kong:8000/auth/v1/admin/users \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"eduardodominikus@hotmail.com","password":"AppCorresp2026!","email_confirm":true}')

echo "$RESULT"

# Extract user ID
USER_ID=$(echo "$RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "User ID: $USER_ID"

if [ -z "$USER_ID" ]; then
  echo "ERROR: Failed to create user"
  exit 1
fi

# 2. Create profile in users table
echo "Creating admin profile..."
curl -s -X POST http://supabase-kong:8000/rest/v1/users \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"id\":\"$USER_ID\",\"email\":\"eduardodominikus@hotmail.com\",\"nome\":\"Eduardo Admin\",\"role\":\"adminMaster\",\"ativo\":true,\"aprovado\":true}"

echo ""
echo "Done!"
