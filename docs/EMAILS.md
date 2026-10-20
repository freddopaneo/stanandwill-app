# E-mails Stan & Will — mise en service (Resend + Supabase)

Trois e-mails, tous envoyés par **Resend** :

| E-mail | Déclencheur | Où est le code |
|---|---|---|
| Code de connexion (6 chiffres) | Supabase Auth, à chaque connexion | `supabase/emails/code-connexion.html` |
| Bienvenue | L'app, juste après la 1ʳᵉ connexion (une seule fois par compte) | `supabase/functions/welcome-email` |
| Récap du dimanche | Programmé chaque dimanche à 17 h UTC (18 h l'hiver, 19 h l'été à Paris) | `supabase/functions/weekly-recap` + `email-prefs` (désinscription) |

Durée totale : environ 30 minutes. Les étapes 1 et 2 peuvent être faites tout de suite ; l'étape 1 bis (domaine dédié) peut attendre.

---

## Étape 1 — Base de données (2 min)
Supabase → **SQL Editor** → nouvelle requête → coller puis **Run**, dans cet ordre :
1. `supabase/migrations/0004_carnet_sync.sql` (Carnet cloud, si pas déjà fait)
2. `supabase/migrations/0005_emails.sql`

## Étape 1 bis — Adresse d'expédition
- **Pour tester tout de suite** : rien à faire, l'expéditeur par défaut est `Stan & Will <bonjour@dopaneo.ai>` (domaine déjà vérifié dans Resend).
- **Pour le lancement** : ajouter un domaine dédié dans Resend (Domains → Add Domain, région **eu-west-1**), par exemple `mail.stanandwill.xx`, copier les enregistrements DNS chez le registrar, puis changer le secret `EMAIL_FROM` (étape 3). Utiliser un sous-domaine (`mail.`) protège la réputation du domaine principal.

## Étape 2 — Code de connexion via Resend (5 min)
1. Resend → **API Keys** → Create → nom `stanandwill-smtp`, permission **Sending access**, domaine `dopaneo.ai` (puis le domaine dédié). Copier la clé (elle ne s'affiche qu'une fois).
2. Supabase → **Authentication → Emails → SMTP Settings** → activer *Custom SMTP* :
   - Host `smtp.resend.com` · Port `465` · Username `resend` · Password : la clé copiée
   - Sender email : `bonjour@dopaneo.ai` · Sender name : `Stan & Will`
3. Supabase → **Authentication → Email Templates** → onglets **Magic Link** puis **Confirm signup** :
   - Objet : `Votre code Stan & Will : {{ .Token }}`
   - Corps : coller tout le contenu de `supabase/emails/code-connexion.html`
4. Tester : dans l'app, « J'ai un compte » → votre adresse → le code arrive avec la nouvelle présentation.

## Étape 3 — Secrets des fonctions (3 min)
Supabase → **Edge Functions → Secrets** → ajouter :

| Nom | Valeur |
|---|---|
| `RESEND_API_KEY` | une 2ᵉ clé Resend « Sending access » (nom `stanandwill-functions`) |
| `EMAIL_FROM` | `Stan & Will <bonjour@dopaneo.ai>` (à remplacer par le domaine dédié plus tard) |
| `EMAIL_REPLY_TO` | l'adresse qui reçoit les réponses (facultatif) |
| `APP_URL` | lien du site ou de la fiche store, ex. `https://stanandwill-dopaneo.vercel.app` |
| `CRON_SECRET` | une longue chaîne aléatoire (Terminal du Mac : `openssl rand -hex 32`) |
| `UNSUBSCRIBE_SECRET` | une autre chaîne aléatoire, même commande |

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement par Supabase.

## Étape 4 — Déployer les 3 fonctions (5 min, Terminal du Mac)
Depuis le dossier `stanandwill-app` :
```bash
npx supabase login
npx supabase link --project-ref tpkzmcwvpsmkuitxhpff
npx supabase functions deploy welcome-email
npx supabase functions deploy weekly-recap --no-verify-jwt
npx supabase functions deploy email-prefs --no-verify-jwt
```
`--no-verify-jwt` : ces deux fonctions ne sont pas appelées par l'app mais par la programmation (protégée par `CRON_SECRET`) et par le lien de désinscription (protégé par une signature).

## Étape 5 — Tester le récap sur votre seule adresse (2 min)
```bash
curl -X POST "https://tpkzmcwvpsmkuitxhpff.supabase.co/functions/v1/weekly-recap" \
  -H "Authorization: Bearer VOTRE_CRON_SECRET" -H "Content-Type: application/json" \
  -d '{"only":"fred@dopaneo.ai"}'
```
Réponse attendue : `{"sent":1,"skipped":…}`. Vérifier l'e-mail, puis cliquer sur « Ne plus recevoir » pour tester la désinscription (et réactiver ensuite dans l'app : Carnet → Réglages → Récap du dimanche).

## Étape 6 — Programmer l'envoi du dimanche (3 min)
Supabase → **Database → Extensions** : activer `pg_cron` et `pg_net`. Puis SQL Editor → Run (remplacer `VOTRE_CRON_SECRET`) :
```sql
select vault.create_secret('VOTRE_CRON_SECRET', 'recap_cron_secret');

select cron.schedule('weekly-recap', '0 17 * * 0', $$
  select net.http_post(
    url := 'https://tpkzmcwvpsmkuitxhpff.supabase.co/functions/v1/weekly-recap',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'recap_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000);
$$);
```
Pour arrêter : `select cron.unschedule('weekly-recap');`

---

## Règles respectées
- **Bienvenue** : une seule fois par compte (verrou `profiles.welcome_sent_at`), rejouée automatiquement si l'envoi échoue.
- **Récap** : uniquement aux maîtres ayant au moins un chien, sans demande de suppression de compte, abonnés (`recap_opt_in`, activé par défaut, désactivable dans l'app ou en un clic depuis l'e-mail). En-têtes `List-Unsubscribe` + désinscription en un clic (exigence Gmail/Yahoo pour les envois réguliers).
- **Idempotence** : clés d'idempotence Resend par compte (bienvenue) et par semaine (récap) : un double déclenchement n'envoie pas deux fois.
- Le récap est un e-mail de service lié au compte (données du chien de l'utilisateur), distinct des e-mails marketing (`consent_marketing`, non utilisés ici).
- Volume : la fonction traite les comptes un par un ; au-delà d'environ 2 000 comptes, la découper en lots (paramètre à ajouter).
