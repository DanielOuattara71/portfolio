# Button

Bouton en pilule : un principal (fond `ink`) par zone, des secondaires (`surface-raised`) à côté, et un bouton icône rond pour les flèches.

## Contenu
- Libellé : un verbe d'action court, sans point (« Voir les projets », « Télécharger le CV »).
- Le libellé est écrit deux fois dans `.ix-btn__roll` : la seconde copie remonte au survol. Elle peut différer (« cv.pdf ») mais garde le même sens.
- Icône optionnelle dans un disque `marker` (`.ix-btn__ico`), uniquement sur le bouton principal.
- `.ix-iconbtn` : 40px, toujours avec un `aria-label`.

## Règles
- Un seul bouton principal par zone visible. Il porte `shadow-button`.
- Un lien qui change de page est un `<a>`, une action sur place est un `<button>`.
- Animations réduites : le texte ne roule plus.
