# MyPA - Deployment Guide (Hindi + English)

## Ye Guide Kiske Liye Hai?
Ye guide aapko batayegi ki apne server pe MyPA app kaise host karein. Free ya saste options available hain.

## ZAROORI: HTTPS Chahiye!
Push notifications (background alarms) ke liye HTTPS (SSL certificate) zaroori hai. Isliye **domain + SSL setup karna recommended hai**. Bina HTTPS ke alarms background mein kaam nahi karenge.

---

## Option 1: Oracle Cloud (FREE Forever - Recommended)

### Step 1: Account Banao
1. https://cloud.oracle.com pe jaao
2. "Start for free" click karo
3. Account banao (credit card chahiye verification ke liye, lekin charge nahi hoga)

### Step 2: VM Instance Create Karo
1. Oracle Cloud Dashboard mein jaao
2. "Create a VM instance" click karo
3. Settings:
   - Shape: VM.Standard.E2.1.Micro (Always Free)
   - Image: Ubuntu 22.04
   - SSH key add karo (ya generate karo)
4. "Create" click karo

### Step 3: Server Setup
SSH se connect karo:
```bash
ssh ubuntu@YOUR_SERVER_IP
```

Project files upload karo:
```bash
# Apne computer se (jahan zip download kiya)
scp mypa-project.zip ubuntu@YOUR_SERVER_IP:~/
```

Server pe:
```bash
# Unzip karo
sudo apt-get install unzip
unzip mypa-project.zip
cd mypa-project

# Setup script chalao
chmod +x setup.sh
./setup.sh
```

### Step 4: .env File Edit Karo
```bash
nano .env
```

Ye values daalo:
- **RAZORPAY_KEY_ID** - Razorpay Dashboard se (https://dashboard.razorpay.com)
- **RAZORPAY_KEY_SECRET** - Razorpay Dashboard se
- **FAST2SMS_API_KEY** - Fast2SMS se (https://www.fast2sms.com)
- **APP_DOMAIN** - Agar domain hai toh (jaise: mypa.yourdomain.com)

Note: SESSION_SECRET, DATABASE_URL, aur VAPID keys setup script automatically generate karta hai.

### Step 5: App Start Karo
```bash
# PM2 install karo (auto-restart ke liye)
sudo npm install -g pm2

# App start karo (with .env file)
pm2 start dist/index.cjs --name mypa
pm2 save
pm2 startup
```

### Step 6: Port Open Karo
Oracle Cloud Console mein:
1. Networking > Virtual Cloud Networks
2. Apna VCN select karo
3. Security Lists > Default Security List
4. "Add Ingress Rules" click karo
5. Source CIDR: 0.0.0.0/0, Destination Port: 80, 443
6. Save karo

Server pe firewall bhi kholo:
```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 5000 -j ACCEPT
sudo apt-get install iptables-persistent
sudo netfilter-persistent save
```

---

## Option 2: Hostinger/DigitalOcean VPS

### Step 1: VPS Purchase Karo
- Hostinger: https://hostinger.in (₹299/month se start)
- DigitalOcean: https://digitalocean.com ($4/month se start)
- Ubuntu 22.04 select karo

### Step 2-6: Same as Oracle Cloud (upar wale steps follow karo)

---

## Domain + HTTPS Setup (ZAROORI for Push Notifications)

Push notifications aur background alarms ke liye HTTPS chahiye. Free SSL certificate mil sakta hai.

### Step 1: Domain Kharido
- GoDaddy, Namecheap, ya BigRock se (~₹500-800/year)
- DNS mein A record add karo pointing to YOUR_SERVER_IP

### Step 2: Nginx + SSL Setup
```bash
sudo apt-get install nginx certbot python3-certbot-nginx

# Nginx config create karo
sudo nano /etc/nginx/sites-available/mypa
```

Ye paste karo:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 10M;
    }
}
```

```bash
# Enable karo
sudo ln -s /etc/nginx/sites-available/mypa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL certificate (HTTPS) free mein lagao - auto renew hoga
sudo certbot --nginx -d yourdomain.com
```

### Step 3: .env mein domain add karo
```bash
nano .env
# APP_DOMAIN=yourdomain.com
```

---

## Android APK Update Karo

Jab server ready ho jaye:

1. `android/app/src/main/assets/capacitor.config.json` file kholo
2. Server URL update karo:

Agar domain + SSL setup kiya hai (RECOMMENDED):
```json
{
  "appId": "com.mypa.app",
  "appName": "MyPA",
  "server": {
    "url": "https://yourdomain.com"
  }
}
```

Agar sirf IP hai (push notifications kaam nahi karenge):
```json
{
  "appId": "com.mypa.app",
  "appName": "MyPA",
  "server": {
    "url": "http://YOUR_SERVER_IP:5000",
    "cleartext": true
  }
}
```

3. Android Studio mein APK rebuild karo

---

## Environment Variables Ki List

| Variable | Zaroori? | Kahan se milega |
|---|---|---|
| DATABASE_URL | Haan | setup.sh auto-generate karta hai |
| SESSION_SECRET | Haan | setup.sh auto-generate karta hai |
| RAZORPAY_KEY_ID | Haan | https://dashboard.razorpay.com |
| RAZORPAY_KEY_SECRET | Haan | https://dashboard.razorpay.com |
| FAST2SMS_API_KEY | Haan | https://www.fast2sms.com |
| VAPID_PUBLIC_KEY | Haan | setup.sh auto-generate karta hai |
| VAPID_PRIVATE_KEY | Haan | setup.sh auto-generate karta hai |
| APP_DOMAIN | Optional | Aapka domain name (bina https://) |
| STRIPE_SECRET_KEY | Optional | https://dashboard.stripe.com (sirf agar Stripe use karna ho) |
| STRIPE_PUBLISHABLE_KEY | Optional | https://dashboard.stripe.com |
| PORT | Optional | Default 5000 |
| NODE_ENV | Auto | production (npm start mein auto set hota hai) |

---

## Useful Commands

```bash
# App status check karo
pm2 status

# Logs dekho
pm2 logs mypa

# App restart karo
pm2 restart mypa

# App stop karo
pm2 stop mypa

# Database backup karo
pg_dump -U mypa_user mypa_db > backup_$(date +%Y%m%d).sql

# Database restore karo
psql -U mypa_user mypa_db < backup_file.sql

# VAPID keys manually generate karo (agar chahiye)
npx web-push generate-vapid-keys
```

---

## Troubleshooting

### App start nahi ho raha
```bash
# Logs check karo
pm2 logs mypa --lines 50

# .env file check karo
cat .env

# Database connection check karo
psql -U mypa_user -d mypa_db -c "SELECT 1;"
```

### Port access nahi ho raha
```bash
# Check karo ki app chal raha hai
curl http://localhost:5000

# Firewall check karo
sudo iptables -L -n | grep 5000
```

### Database error
```bash
# Database tables create karo
DATABASE_URL="postgresql://mypa_user:YOUR_DB_PASSWORD@localhost:5432/mypa_db" npm run db:push
```

### Push notifications kaam nahi kar rahe
- HTTPS (SSL) setup kiya hai? Bina SSL ke push notifications kaam nahi karenge
- VAPID keys .env mein hain? Check karo: `grep VAPID .env`
- Browser permission diya hai? App mein Settings > Enable Notifications
