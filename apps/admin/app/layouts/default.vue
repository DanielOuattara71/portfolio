<script setup lang="ts">
import { ROLE_LABELS } from '@portfolio/shared/permissions'

/** Admin shell: sidebar grouped by module, sticky top bar, drawer under 900px (docs/admin/07). */
const nav = useNav()
const me = useMe()
const route = useRoute()
const config = useRuntimeConfig()
const open = ref(false)

const extra: Record<string, string> = { '/compte': 'Mon compte' }
const current = computed(() => nav.flatMap((g) => g.items).find((i) => i.to === route.path)?.label ?? extra[route.path] ?? '')
watch(() => route.fullPath, () => (open.value = false))

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
</script>

<template>
  <div class="app" @keydown="onKey">
    <a class="skip" href="#view">Aller au contenu</a>
    <aside id="sb" class="sb" :class="{ open }" aria-label="Navigation de l'administration">
      <div class="brand">
        <span class="mk" aria-hidden="true">/</span>
        <span>Administration<small>Portfolio · FR / EN</small></span>
      </div>
      <nav class="nav">
        <div v-for="g in nav" :key="g.group" class="grp">
          <span v-if="g.group" class="lab">{{ g.group }}</span>
          <template v-for="item in g.items" :key="item.to">
            <NuxtLink v-if="item.ready" :to="item.to" :aria-current="route.path === item.to ? 'page' : undefined">
              <span class="dot" aria-hidden="true" />{{ item.label }}
            </NuxtLink>
            <span v-else class="soon" aria-disabled="true">
              <span class="dot" aria-hidden="true" />{{ item.label }}<span class="tag">bientôt</span>
            </span>
          </template>
        </div>
      </nav>
      <div v-if="me" class="me">
        <span class="avatar" aria-hidden="true">{{ me.user.name.slice(0, 1).toUpperCase() }}</span>
        <span class="who">
          <b>{{ me.user.name }}</b>
          <span class="muted">{{ ROLE_LABELS[me.user.role] }} · 2FA {{ me.user.twoFactorEnabled ? 'active' : 'inactive' }}</span>
        </span>
        <span class="acts">
          <NuxtLink class="btn ghost" to="/compte">Mon compte</NuxtLink>
          <button class="btn ghost" type="button" @click="signOut()">Se déconnecter</button>
        </span>
      </div>
    </aside>
    <div v-if="open" class="scrim" aria-hidden="true" @click="open = false" />

    <div class="main">
      <header class="top">
        <NuxtLoadingIndicator :height="22" :throttle="200" :duration="2500" color="transparent" class="ondyx-bar">
          <span class="ondyx-bar-label" aria-hidden="true">ONDYX</span>
        </NuxtLoadingIndicator>
        <button class="btn sec menu" type="button" aria-controls="sb" :aria-expanded="open" @click="open = !open">Menu</button>
        <span class="crumb">Admin<template v-if="current"> / <b>{{ current }}</b></template></span>
        <span class="sp" />
        <a class="btn sec" :href="config.public.siteUrl" target="_blank" rel="noopener">Voir le site <span aria-hidden="true">↗</span><span class="sr-only"> (nouvel onglet)</span></a>
      </header>
      <main id="view" tabindex="-1">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  min-height: 100%;
}

.skip {
  position: absolute;
  left: 12px;
  top: -60px;
  z-index: 100;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--ink);
  color: var(--on-ink);
}

.skip:focus {
  top: 12px;
}

.sb {
  position: sticky;
  top: 0;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100vh;
  overflow-y: auto;
  padding: 18px 14px;
  border-right: 1px solid var(--line);
  background: var(--surface-raised);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}

.brand small {
  display: block;
  font-size: 11px;
  font-weight: 400;
  color: var(--ink-muted);
}

.mk {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  background: var(--marker);
  color: var(--on-marker);
  font-weight: 700;
  box-shadow: inset 0 0 0 1.5px var(--on-marker);
}

.nav,
.grp {
  display: grid;
}

.nav {
  gap: 14px;
}

.grp {
  gap: 2px;
}

.grp .lab {
  padding: 0 10px 4px;
}

.grp a,
.soon {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  text-decoration: none;
}

.grp a:hover {
  background: var(--surface-sunken);
}

.grp a[aria-current='page'] {
  background: var(--ink);
  color: var(--on-ink);
}

.dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--line);
}

.grp a[aria-current='page'] .dot {
  background: var(--marker);
}

.soon {
  color: var(--ink-muted);
  cursor: default;
}

.tag {
  margin-left: auto;
  font-size: 10.5px;
  padding: 0 6px;
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
}

.me {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 4px 10px;
  margin-top: auto;
  padding: 10px;
  border-radius: var(--radius-md);
  background: var(--surface-sunken);
  font-size: 12px;
}

.avatar {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--line);
  font-weight: 600;
}

.who {
  display: grid;
  min-width: 0;
}

.who b {
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acts {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.acts .btn {
  padding: 4px 6px;
  font-size: 12px;
}

.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.top {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  backdrop-filter: blur(8px);
}

.crumb {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--ink-muted);
}

.crumb b {
  font-weight: 500;
  color: var(--ink);
}

/* ONDYX navigation loader */
.ondyx-bar {
  background: linear-gradient(90deg, var(--marker), var(--marker) 60%, var(--focus-ring));
  overflow: hidden;
}

.ondyx-bar-label {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font: 800 10px/1 var(--font-data);
  letter-spacing: 0.3em;
  color: var(--on-marker);
}

.sp {
  flex: 1;
}

.menu,
.scrim {
  display: none;
}

#view {
  display: grid;
  align-content: start;
  gap: 20px;
  width: 100%;
  max-width: 1280px;
  padding: 24px 24px 64px;
}

#view:focus {
  outline: none;
}

@media (max-width: 900px) {
  .app {
    grid-template-columns: minmax(0, 1fr);
  }

  .sb {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 40;
    width: min(290px, 86vw);
    height: 100%;
    transform: translateX(-102%);
    transition: transform var(--duration-fast) var(--ease-out);
    box-shadow: var(--shadow-menu);
  }

  .sb.open {
    transform: none;
  }

  .scrim {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 30;
    background: color-mix(in srgb, var(--ink) 40%, transparent);
  }

  .menu {
    display: inline-flex;
  }

  .top,
  #view {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
