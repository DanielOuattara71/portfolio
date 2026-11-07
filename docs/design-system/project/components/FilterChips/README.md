# FilterChips

Groupe de filtres en pilule. Le fond `ink` de l'élément actif glisse vers le filtre choisi.

## Contenu
- Domaines : tous, web, mobile, data, cloud, ia. Compteur réel en exposant.
- Un domaine à 0 reste affiché, avec un état vide explicite dans la liste.

## Règles
- `aria-pressed` sur chaque bouton ; un seul actif.
- L'indicateur prend la position ET la hauteur du filtre actif (le groupe peut passer sur deux lignes sur mobile).
- Animations réduites : l'indicateur saute sans glisser.
