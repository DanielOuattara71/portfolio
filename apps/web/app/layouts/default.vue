<template>
  <div class="site">
    <NuxtLoadingIndicator :height="22" :throttle="200" :duration="2500" color="transparent" class="ondyx-bar">
      <span class="ondyx-bar-label" aria-hidden="true">ONDYX</span>
    </NuxtLoadingIndicator>
    <LayoutSkipLink />
    <LayoutIntro />
    <LayoutCurtain />
    <LayoutCursor />
    <div class="grain" aria-hidden="true" />
    <LayoutNavBar />
    <main id="main" tabindex="-1">
      <slot />
    </main>
    <LayoutSiteFooter />
  </div>
</template>

<style scoped>
.site {
  position: relative;
  min-height: 100vh;
}

main {
  position: relative;
  z-index: 2;
}

/* ONDYX navigation loader: brand sweep, following the progress of page loads */
.ondyx-bar {
  background: linear-gradient(90deg, var(--marker), var(--marker) 60%, var(--focus-ring));
  overflow: hidden;
}

.ondyx-bar-label {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font: 800 10px/1 var(--font-display);
  letter-spacing: 0.3em;
  color: var(--on-marker);
}
</style>
