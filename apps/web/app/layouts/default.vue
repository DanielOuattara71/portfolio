<template>
  <div class="site">
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
</style>
