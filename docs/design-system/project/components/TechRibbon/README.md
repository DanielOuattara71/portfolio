# TechRibbon

Ruban d'icônes de technologies sous le Hero, sur le modèle d'aquidev : tuiles carrées aux couleurs de chaque marque, filet au-dessus, bords estompés, défilement continu.

## Contenu
- Uniquement les technologies réellement utilisées dans les projets (module Compétences de l'admin, case « afficher dans le ruban »).
- Logos : Simple Icons (licence CC0), intégrés en SVG ; fond = couleur officielle, logo blanc ou `ink` selon le contraste.
- Sans logo officiel (API REST, LLM, RAG) : tuile `ink` avec le texte en `marker`.

## Règles
- La liste est dupliquée pour une boucle continue ; la copie est `aria-hidden`.
- Pause au survol et au focus. Un tour = `duration-marquee`.
- Animations réduites : ruban immobile.
- Chaque tuile a un `title` ; le nom s'affiche au survol.
