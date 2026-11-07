# Panel

Conteneur arrondi (`radius-2xl`) qui porte une section. Deux variantes qui alternent pour rythmer la page.

## Variantes
- `.ix-panel--raised` : `surface-raised` + filet `line` intérieur.
- `.ix-panel.ix-inverse` : `surface-inverse`, texte `ink-inverse`.

## Règles
- Padding fluide : `clamp(22px, 4vw, 48px)`. 24px entre deux panneaux.
- Le Hero n'est JAMAIS dans un panneau : il est posé directement sur `surface`.
- Pas deux panneaux sombres d'affilée.
