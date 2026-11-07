# PortraitStack

Pile de trois cartes inclinées, à droite du Hero : la photo, sa version « données » en trame 1 bit, et une fiche profil sombre. On les fait défiler.

## Contenu
- Carte 1 : photo professionnelle importée dans l'admin, en noir et blanc légèrement réchauffé, format 4:5.
- Carte 2 : la même photo transformée en trame 1 bit (`marker` / `ink`). Générée automatiquement à partir de la photo, jamais dessinée à la main.
- Carte 3 : fiche profil sur `surface-inverse` (rôle, langues, mode de travail, ville), avec RecordFields.
- Badge rotatif accroché au coin haut-gauche : les domaines autour de l'identifiant `001`.

## Comportement
- Clic sur la pile, flèches, ou glissement horizontal de plus de 40px : la carte du dessus part vers la gauche puis se range derrière.
- Les cartes de derrière sont `aria-hidden` ; l'étiquette sous la pile annonce la carte visible.
- Sous `bp-lg` : la pile passe sous le nom, alignée à droite, jamais centrée.
- Animations réduites : changement instantané, badge immobile.
