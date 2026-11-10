/**
 * Admin navigation (docs/admin/07-maquettes-admin.html). `ready: false` marks modules not built yet:
 * they are listed, but not clickable, so nothing pretends to work before it does.
 */
export interface NavItem {
  to: string
  label: string
  ready: boolean
}

export function useNav(): { group: string; items: NavItem[] }[] {
  return [
    { group: '', items: [{ to: '/', label: 'Tableau de bord', ready: true }] },
    {
      group: 'Contenus',
      items: [
        { to: '/projets', label: 'Projets', ready: true },
        { to: '/textes', label: 'Textes du site', ready: true },
        { to: '/competences', label: 'Compétences', ready: true },
        { to: '/parcours', label: 'Parcours', ready: true },
        { to: '/medias', label: 'Médiathèque', ready: true },
      ],
    },
    {
      group: 'Publication',
      items: [
        { to: '/traductions', label: 'Traductions', ready: true },
        { to: '/seo', label: 'SEO', ready: false },
        { to: '/messages', label: 'Boîte de réception', ready: true },
      ],
    },
    {
      group: 'Système',
      items: [
        { to: '/securite', label: 'Sécurité et surveillance', ready: true },
        { to: '/journal', label: "Journal d'activité", ready: true },
        { to: '/sessions', label: 'Sessions', ready: true },
        { to: '/sauvegardes', label: 'Sauvegardes', ready: true },
        { to: '/parametres', label: 'Paramètres', ready: true },
      ],
    },
  ]
}
