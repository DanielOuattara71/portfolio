# QueryBar

Champ de recherche écrit comme une ligne de requête. Il filtre les projets, et plus tard les articles, sur le nom, la stack et le contexte.

## Règles
- Le libellé `query >` est un vrai `<label>` lié au champ.
- Filtrage immédiat à la saisie, résultat annoncé dans une zone `aria-live` (« 2 / 5 enregistrements »).
- Combiné avec FilterChips : les deux filtres s'additionnent.
