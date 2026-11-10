<script setup lang="ts">
/**
 * Translations (docs/admin/02 §H): missing FR/EN fields per content, computed from schemas.
 * Every row links to the editor of that content.
 */
useHead({ title: 'Traductions · Administration' })

interface Missing {
  path: string
  locale: 'fr' | 'en'
  filledInOther: boolean
}
interface Item {
  id: string
  type: string
  key: string
  status: string
  missing: Missing[]
}

const items = ref<Item[]>([])
const total = ref(0)
const loading = ref(true)
const notice = ref<string | null>(null)
const filter = ref('all')

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ items: Item[]; totalMissing: number }>('/api/admin/translations')
    items.value = res.items
    total.value = res.totalMissing
  } catch {
    notice.value = "Impossible de charger les traductions."
  }
  loading.value = false
}
onMounted(load)

const visible = computed(() => (filter.value === 'all' ? items.value : items.value.filter((i) => i.type === filter.value)))
const types = computed(() => [...new Set(items.value.map((i) => i.type))])

function linkFor(i: Item): string {
  if (i.type === 'project') return `/projets/${i.id}`
  if (i.type === 'block') return `/textes?key=${encodeURIComponent(i.key)}`
  if (i.type === 'skill' || i.type === 'domain') return '/competences'
  return '/parcours'
}
</script>

<template>
  <div class="head">
    <div class="t">
      <h1>Traductions</h1>
      <p class="muted">Champs FR / EN manquants (vides ou `null` dans une langue). Une langue incomplète bloque la publication des textes et des projets.</p>
    </div>
    <span class="chip info">{{ total }} champ(s) manquant(s)</span>
  </div>

  <div class="row">
    <div class="seg" role="group" aria-label="Filtrer par type">
      <button type="button" :aria-pressed="filter === 'all'" @click="filter = 'all'">Tous</button>
      <button v-for="t in types" :key="t" type="button" :aria-pressed="filter === t" @click="filter = t">{{ t }}</button>
    </div>
    <span class="sp" />
    <button class="btn sec" type="button" @click="load">Actualiser</button>
  </div>

  <p v-if="notice" class="alert crit" role="alert">{{ notice }}</p>

  <div class="tw">
    <table>
      <thead><tr><th>Contenu</th><th>Type</th><th>FR</th><th>EN</th><th>Manquant</th><th><span class="sr-only">Lien</span></th></tr></thead>
      <tbody>
        <tr v-for="i in visible" :key="i.id">
          <td><b style="font-weight: 500">{{ i.key }}</b></td>
          <td>{{ i.type }}</td>
          <td>{{ i.missing.some((m) => m.locale === 'fr') ? '✕' : '✓' }}</td>
          <td>{{ i.missing.some((m) => m.locale === 'en') ? '✕' : '✓' }}</td>
          <td class="small">
            <div v-for="(m, k) in i.missing.slice(0, 6)" :key="k">
              <code>{{ m.path }}</code> ({{ m.locale.toUpperCase() }})<template v-if="!m.filledInOther"> · à écrire</template>
            </div>
            <span v-if="i.missing.length > 6" class="muted">+{{ i.missing.length - 6 }} autres</span>
          </td>
          <td><NuxtLink class="btn sec" :to="linkFor(i)">Compléter</NuxtLink></td>
        </tr>
        <tr v-if="!loading && !visible.length"><td colspan="6" class="muted">Aucune traduction manquante.</td></tr>
        <tr v-if="loading"><td colspan="6"><span class="sk" style="height: 40px" /></td></tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.sp {
  flex: 1;
}
</style>
