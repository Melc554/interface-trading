# CAP — Compte-titres

Interface responsive noir et blanc reprise de CAP : journal des décisions, historique des transactions, courbe des valorisations, notes, événements, stratégie et calculateur de seuils.

## Architecture
- Frontend statique sans dépendance, dossier `public`, hébergement Vercel.
- Supabase Auth et API REST ; données séparées par utilisateur avec RLS.
- La configuration publique se trouve dans `public/config.js`. Aucune clé secrète dans le dépôt.
- Migration SQL : `supabase/001_records.sql`.
- Les données de référence de l’ancienne interface restent privées et ne sont pas incluses dans ce dépôt.

## Aperçu
`python3 -m http.server 8787 --directory public`

## Limites actuelles
- Les valeurs et décisions sont renseignées manuellement ; aucun flux de cours ni import automatique des analyses ChatGPT.
- Courbe de valeur, pas rendement : les apports/retraits sont inclus dans la variation.
- Aucun ordre courtier, seuil non surveillé.
- Synchronisation à la connexion, après saisie et via Actualiser.
- Démonstration isolée en mémoire, réinitialisée au rechargement.

Documentation : [Vercel](https://vercel.com/docs/project-configuration/vercel-json), [Supabase Auth](https://supabase.com/docs/guides/auth), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
