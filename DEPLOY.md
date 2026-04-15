# Guide de déploiement — Portail IT ISM

## Prérequis serveur

- **Node.js** 18+ (recommandé 20 LTS)
- **Nginx** (reverse proxy + HTTPS)
- **PM2** (gestionnaire de processus Node.js)

```bash
# Installer Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs

# Installer PM2
sudo npm install -g pm2
```

## Installation

```bash
# 1. Cloner le projet
git clone <URL_DU_DEPOT> /opt/portail-it
cd /opt/portail-it

# 2. Installer les dépendances
npm install
cd server && npm install && cd ..

# 3. Build le frontend
npm run build
```

## Configuration

```bash
# 4. Créer le fichier .env de production
cp server/.env server/.env.prod
nano server/.env
```

**Variables obligatoires à configurer :**

```env
# Production
NODE_ENV=production
ALLOWED_ORIGINS=https://portail-it.groupeism.sn

# Sécurité — OBLIGATOIRE : générer un secret fort
JWT_SECRET=GENERER_AVEC: openssl rand -hex 32

# Admin — premier démarrage uniquement
ADMIN_DEFAULT_EMAIL=admin@groupeism.sn
ADMIN_DEFAULT_PASSWORD=mot_de_passe_fort_ici

# IA (assistant conversationnel)
ANTHROPIC_API_KEY=sk-ant-api03-...

# GLPI
GLPI_API_URL=https://help.groupeism.sn/apirest.php
GLPI_APP_TOKEN=votre_app_token
GLPI_USER_TOKEN=votre_user_token

# SMTP (notifications email)
SMTP_HOST=smtp.groupeism.sn
SMTP_PORT=587
SMTP_USER=portail-it@groupeism.sn
SMTP_PASS=mot_de_passe_smtp
SMTP_FROM=portail-it@groupeism.sn
DSI_EMAILS=tech1@groupeism.sn,tech2@groupeism.sn

# OneLogin SSO (optionnel)
ONELOGIN_CLIENT_ID=
ONELOGIN_CLIENT_SECRET=
ONELOGIN_ISSUER=https://groupeism.onelogin.com
```

## Base de données

La base SQLite est créée automatiquement au premier démarrage dans `server/portail.db`.

**Sauvegarde automatique :**
```bash
# Ajouter au crontab (sauvegarde quotidienne à 2h)
crontab -e
0 2 * * * cp /opt/portail-it/server/portail.db /opt/backups/portail-$(date +\%Y\%m\%d).db
```

**Restauration :**
```bash
# Arrêter le serveur
pm2 stop portail-it

# Restaurer
cp /opt/backups/portail-YYYYMMDD.db /opt/portail-it/server/portail.db

# Redémarrer
pm2 start portail-it
```

## Lancement

```bash
# 5. Démarrer avec PM2
cd /opt/portail-it/server
pm2 start index.js --name portail-it --env production
pm2 save
pm2 startup  # Démarrage auto au boot
```

## Nginx (reverse proxy + HTTPS)

```nginx
server {
    listen 80;
    server_name portail-it.groupeism.sn;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name portail-it.groupeism.sn;

    ssl_certificate     /etc/ssl/certs/portail-it.crt;
    ssl_certificate_key /etc/ssl/private/portail-it.key;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/portail-it /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Fichiers importants

| Fichier | Description | Sauvegarde |
|---|---|---|
| `server/portail.db` | Base de données SQLite | OUI — contient tout |
| `server/.env` | Configuration et secrets | OUI — hors du dépôt Git |
| `server/uploads/` | Fichiers uploadés (captures, PJ) | OUI |
| `dist/` | Frontend compilé | NON — regénérable avec `npm run build` |

## Mise à jour

```bash
cd /opt/portail-it

# Sauvegarder la base
cp server/portail.db server/portail.db.bak

# Mettre à jour le code
git pull

# Installer les nouvelles dépendances
npm install && cd server && npm install && cd ..

# Rebuilder le frontend
npm run build

# Redémarrer
pm2 restart portail-it
```

## Monitoring

```bash
pm2 status          # État du processus
pm2 logs portail-it # Logs en temps réel
pm2 monit           # Dashboard monitoring
```

## Checklist post-déploiement

- [ ] Changer le mot de passe admin par défaut
- [ ] Vérifier la connexion GLPI (`/api/glpi/status`)
- [ ] Tester l'envoi d'email (configurer SMTP)
- [ ] Configurer le certificat SSL
- [ ] Mettre en place la sauvegarde automatique de `portail.db`
- [ ] Configurer OneLogin SSO si applicable
- [ ] Créer les comptes utilisateurs (import CSV ou manuellement)
