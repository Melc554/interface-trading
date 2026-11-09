# CAP — Compte-titres

Interface responsive noir et blanc reprise de CAP : journal des décisions, historique des transactions, courbe des valorisations, notes, événements, stratégie et calculateur de seuils.

## Architecture
- Frontend statique sans dépendance, dossier `public`, hébergement Vercel.
- Supabase Auth et API REST ; données séparées par utilisateur avec RLS.
- La configuration publique se trouve dans `public/config.js`. Aucune clé secrète dans le dépôt.
- Migrations SQL : `supabase/001_records.sql` à `005_analysis_budget.sql`, puis `20261109122008_analysis_budget_status.sql`.
- Les données de référence de l’ancienne interface restent privées et ne sont pas incluses dans ce dépôt.

## Aperçu
`python3 -m http.server 8787 --directory public`

## Limites actuelles
- Les valeurs et décisions sont renseignées manuellement ; aucun flux de cours. Les tâches ChatGPT précédentes ne sont pas copiées.
- Courbe de valeur, pas rendement : les apports/retraits sont inclus dans la variation.
- Aucun ordre courtier, seuil non surveillé.
- Synchronisation à la connexion, après saisie et via Actualiser.
- Démonstration isolée en mémoire, réinitialisée au rechargement.

Documentation : [Vercel](https://vercel.com/docs/project-configuration/vercel-json), [Supabase Auth](https://supabase.com/docs/guides/auth), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Analyses automatiques
Fonction Supabase `cap-daily-analysis`, déclenchée par pg_cron/pg_net, protégée par un secret aléatoire en Vault (seul son SHA-256 est dans la configuration). Elle utilise OpenAI Responses avec recherche web. Horaire Europe/Paris : lundi–vendredi 8 h et 15 h, changement d’heure géré. Une tentative maximum par créneau, sans relance coûteuse automatique. Une réponse incomplète ou sans sources reconnues ne crée pas de décision. Résultats et statut de fin sont écrits dans une transaction.

Activation : configurer `OPENAI_API_KEY` dans les secrets Edge Functions Supabase, définir le budget avec le propriétaire, tester réellement l’accès/modèle et une exécution, puis activer la ligne propriétaire de `cap_automation`. Ne pas publier de clé API. La configuration reste désactivée par défaut. Le modèle est configurable dans la base, verrouillé sur `gpt-5.4-mini-2026-03-17`. Les appels sont limités à 6 000 tokens de sortie et 100 secondes, sans garantie de coût monétaire ; appliquer les limites du compte fournisseur. Une interruption avant l’enregistrement final apparaît comme exécution interrompue après 3 minutes dans l’interface.

Tests Node : `node tests/domain.mjs`, `node tests/session-race.mjs`, `node tests/automatic-analysis.mjs`.

Budget utilisateur : 10 EUR/mois maximum. Garde-fou interne conservateur : 6 USD/mois, réserve transactionnelle de 1,50 USD avant chaque appel, sans remboursement de réserve en cas de timeout. Après réponse, estimation aux tarifs standard du 09/11/2026 (0,75 USD/M entrée, 4,50 USD/M sortie, trois recherches à 0,01 USD), majorée de 20 %. Plafond sorties 6000 tokens et 3 outils. Ce suivi ne remplace pas la facture fournisseur : confirmer tarifs, conversion et paramètres du compte avant activation. Utiliser une clé dédiée, sans recharge automatique. Aucun basculement automatique vers un modèle plus cher.

Le panneau des analyses affiche le budget du mois, les réserves incluses et la date de renouvellement. Une panne de ce panneau ne bloque pas le journal. Le RPC de statut ne retourne que la configuration du compte connecté, sans secret.

Un rattrapage administratif authentifié peut fournir le header `x-cap-catch-up-slot` (`08:00` ou `15:00`). Il consomme le créneau du jour et le même budget, sans contourner les doublons ni lancer de relance automatique. Le navigateur ne possède jamais le secret du planificateur.
