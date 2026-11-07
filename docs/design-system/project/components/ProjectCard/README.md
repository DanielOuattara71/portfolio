# ProjectCard

Fiche d'un projet dans la grille /PROJETS : média, badges, nom, description courte et champs.

## Le contenu vient de l'admin
- Média : image de couverture (16:10), recadrée en `object-fit: cover`. Sans image : hachures `placeholder` + « capture à fournir ».
- Badges : identifiant + contexte (client, stage, académique, ce site).
- `h3` : nom du projet. Paragraphe : description courte (2 lignes au plus).
- RecordFields : stack, rôle, période.

## Comportement
- Toute la carte est un lien vers l'étude de cas. Au survol : zoom de l'image à 104 % sur `duration-slow`, curseur « voir » sur ordinateur.
- Grille de 2 colonnes, 1 sous `bp-md`.
