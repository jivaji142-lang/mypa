#!/bin/bash

echo "========================================="
echo "  MyPA - Server Setup Script"
echo "========================================="
echo ""

if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

if ! command -v psql &> /dev/null; then
    echo "PostgreSQL not found. Installing..."
    sudo apt-get update
    sudo apt-get install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

DB_PASSWORD=$(openssl rand -hex 16)

echo ""
echo "Setting up PostgreSQL database..."
sudo -u postgres psql -c "CREATE USER mypa_user WITH PASSWORD '${DB_PASSWORD}';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "CREATE DATABASE mypa_db OWNER mypa_user;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE mypa_db TO mypa_user;"
echo "Database created: mypa_db"
echo "Database password: ${DB_PASSWORD} (save this!)"

if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    
    SESSION_SECRET=$(openssl rand -hex 32)
    sed -i "s/your-random-secret-string-here/$SESSION_SECRET/" .env
    sed -i "s|postgresql://username:password@localhost:5432/mypa_db|postgresql://mypa_user:${DB_PASSWORD}@localhost:5432/mypa_db|" .env
    
    echo ""
    echo "Generating VAPID keys for push notifications..."
    VAPID_KEYS=$(npx web-push generate-vapid-keys --json 2>/dev/null || echo "")
    if [ ! -z "$VAPID_KEYS" ]; then
        VAPID_PUB=$(echo $VAPID_KEYS | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);console.log(j.publicKey)" 2>/dev/null || echo "")
        VAPID_PRIV=$(echo $VAPID_KEYS | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);console.log(j.privateKey)" 2>/dev/null || echo "")
        if [ ! -z "$VAPID_PUB" ] && [ ! -z "$VAPID_PRIV" ]; then
            sed -i "s|your_vapid_public_key_here|${VAPID_PUB}|" .env
            sed -i "s|your_vapid_private_key_here|${VAPID_PRIV}|" .env
            echo "VAPID keys generated successfully!"
        fi
    fi
    
    echo ""
    echo "IMPORTANT: Edit .env file and add your keys!"
else
    echo ".env file already exists, skipping..."
fi

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Building application..."
npm run build

echo ""
echo "Setting up database tables..."
export DATABASE_URL="postgresql://mypa_user:${DB_PASSWORD}@localhost:5432/mypa_db"
npm run db:push

echo ""
echo "========================================="
echo "  Setup Complete!"
echo "========================================="
echo ""
echo "IMPORTANT: Before starting the app:"
echo "1. Edit .env file: nano .env"
echo "2. Add your Razorpay keys (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)"
echo "3. Add your Fast2SMS API key (FAST2SMS_API_KEY)"
echo "4. Add your domain name (APP_DOMAIN) if you have one"
echo ""
echo "To start the app:"
echo "  npm start"
echo ""
echo "To run with PM2 (recommended for auto-restart):"
echo "  sudo npm install -g pm2"
echo "  pm2 start dist/index.cjs --name mypa --env-path .env"
echo "  pm2 save"
echo "  pm2 startup"
echo ""
echo "App will run on: http://YOUR_SERVER_IP:5000"
echo "========================================="
