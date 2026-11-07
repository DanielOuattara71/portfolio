# ProjectTypeTile

Bandeau orange « Et votre projet ? » avec des tuiles à cocher. Les choix pré-remplissent le formulaire de contact.

## Contenu
- Titre `display-statement` avec un mot en `accent-italic` souligné.
- 6 tuiles : Application web, Application mobile, API & back-end, IA & automatisation, Données, Autre.

## Règles
- Sélection multiple, `aria-pressed` sur chaque tuile. Tuile choisie : fond `on-marker`, texte `marker`.
- Focus : `focus-ring-on-marker` (classe `.ix-on-marker` sur le bandeau).
- Un seul bandeau `marker` par page.
