# HeroName

Nom en très grand en haut du Hero, posé directement sur `surface` : prénom en contour, nom en plein, avec la ligne d'enregistrement au-dessus.

## Contenu
- Prénom et nom depuis l'admin (Paramètres → nom affiché).
- Ligne d'enregistrement : `record 001 / profile`, langues, date de dernière mise à jour réelle.

## Règles
- `display-hero`, fluide `clamp(46px, 9.2vw, 136px)`. Passe sur deux lignes si besoin, jamais coupé dans un mot.
- La PortraitStack peut chevaucher la fin du nom (elle passe au-dessus).
- Le texte en contour garde un vrai texte accessible (`aria-label` sur le conteneur).
