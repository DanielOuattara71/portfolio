<script setup lang="ts">
/** Layout of the sign-in, password reset and two-factor setup pages: one centred card, no navigation. */
</script>

<template>
  <main class="auth">
    <div class="card">
      <div class="brand">
        <span class="mk" aria-hidden="true">/</span>
        <span>Administration<small>Portfolio · accès réservé</small></span>
      </div>
      <slot />
    </div>
  </main>
</template>

<style scoped>
.auth {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 32px 16px;
}

.card {
  display: grid;
  gap: 16px;
  width: min(420px, 100%);
  padding: 28px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface-raised);
  box-shadow: var(--shadow-menu);
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
</style>
