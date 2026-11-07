# NavBar

Barre collante en trois parties, sur le modèle d'aquidev : logo à gauche, pilule de liens centrée, statut et langue à droite.

## Contenu
- Logo : carré `marker` de 32px avec les initiales en police `data`, puis le nom.
- Pilule : 5 liens au plus. La section en cours porte `aria-current` et un point `marker` cerclé d'`ink`. Les compteurs (`sup`) viennent de la base.
- Droite : StatusPill et LangToggle.

## Comportement
- Se cache en glissant vers le haut quand on descend (après 140px), revient dès qu'on remonte. Reste visible si un de ses éléments a le focus clavier.
- Sous `bp-lg` (900px) : la pilule et le statut disparaissent, un bouton rond `ink` ouvre le menu mobile (`.ix-mnav`).
- Pas de fond plein sur la barre : seule la pilule a un fond.
