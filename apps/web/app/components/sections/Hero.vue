<script setup lang="ts">
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { duration } from '@portfolio/design-tokens/motion'

/**
 * Home hero (docs/10-maquettes.md §1; motion M-02). Sits directly on the page background, no card.
 * Elements marked data-reveal are hidden by the boot script until the entrance runs.
 */
const { t } = useI18n()
const localePath = useLocalePath()
const { homeTo } = useHomeAnchor()
const site = useSite()
const content = useHomeContent()
const introDone = useIntroDone()

const root = ref<HTMLElement | null>(null)
const display = useDisplayName()
const words = computed(() => display.value.words)
let ctx: gsap.Context | null = null
let played = false

function revealAll() {
  if (!root.value) return
  gsap.set(root.value.querySelectorAll('[data-reveal]'), { opacity: 1, clearProps: 'animation' })
}

function play() {
  if (played || !root.value) return
  played = true
  const el = root.value
  if (prefersReducedMotion()) {
    revealAll()
    return
  }
  const mobile = window.matchMedia('(max-width: 899px)').matches

  ctx = gsap.context(() => {
    revealAll()
    const lines = SplitText.create(el.querySelectorAll('[data-split]'), { type: 'lines', mask: 'lines', aria: 'none' })
    const tl = gsap.timeline({
      defaults: { ease: EASE.out },
      onComplete: () => lines.revert(),
    })

    tl.from('.rec', { opacity: 0, duration: duration.base }, 0)
      .from('.word > span', { yPercent: 110, duration: 0.9, stagger: mobile ? 0.05 : 0.08 }, 0)

    if (mobile) {
      tl.from('.stack', { opacity: 0, y: 24, duration: duration.slow }, 0.2)
    } else {
      // Fan out from a straight pile, back card first. CSS transitions are paused during the tween
      // (they would fight GSAP), then CSS takes over again.
      gsap.set('.pc', { transition: 'none' })
      tl.from(
        '.pc',
        {
          x: 0,
          y: 0,
          rotate: 0,
          scale: 0.96,
          opacity: 0,
          duration: 1,
          stagger: { each: 0.12, from: 'end' },
          clearProps: 'transform,opacity,transition',
        },
        0.2,
      )
    }

    tl.from(lines.lines, { yPercent: 110, duration: duration.slow, stagger: 0.06 }, 0.25)
      .from('.actions > *', { y: 16, opacity: 0, duration: 0.6, stagger: 0.06, clearProps: 'transform' }, 0.45)
      .from('.stats > *', { y: 16, opacity: 0, duration: 0.6, stagger: 0.06 }, 0.55)
      .from('.ctl', { opacity: 0, duration: duration.base }, 0.6)
      .from('.rbadge', { scale: 0, rotate: -90, duration: 0.6 }, 0.7)
  }, el)
}

onMounted(() => {
  if (introDone.value) play()
  else {
    // Hide immediately (already hidden by CSS when JS boots in time), then wait for the intro.
    const stop = watch(introDone, (done) => {
      if (done) {
        stop()
        play()
      }
    })
  }
})

onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <section id="home" ref="root" class="hero" aria-labelledby="hero-title">
    <div class="wrap">
      <div class="inner">
        <p class="name" aria-hidden="true" data-reveal>
          <span v-for="(word, i) in words" :key="i" class="word"><span :class="{ 'outline-text': i === 0 }">{{ word }}</span></span>
        </p>

        <SectionsPortraitStack class="stack" data-reveal :badge="content.badge" :profile="content.profile" />

        <div class="foot">
          <div class="intro">
            <!-- Without a name, the giant headline already shows the title: no duplicate eyebrow. -->
            <span v-if="!display.isFallback" class="eyebrow" data-reveal>{{ content.eyebrow }}</span>
            <h1 id="hero-title" class="lead" data-reveal data-split>
              <span v-if="site.name" class="sr-only">{{ site.name }}, </span>{{ content.lead }}
            </h1>
            <p class="value" data-reveal data-split>
              <template v-for="(seg, i) in content.value" :key="i">
                <span v-if="seg.accent" class="acc">{{ seg.text }}</span>
                <template v-else>{{ seg.text }}</template>
              </template>
            </p>
            <div class="actions" data-reveal>
              <UiButton v-magnetic :label="t('cta.projects')" :to="homeTo('home-projects')" icon="↗" />
              <UiButton v-if="site.cvUrl" :label="t('cta.cv')" roll-label="cv.pdf" :href="site.cvUrl" variant="secondary" />
              <UiButton v-else :label="t('cta.readProfile')" :to="homeTo('home-profile')" variant="secondary" />
            </div>
          </div>
          <ul class="stats" data-reveal>
            <li v-for="(s, i) in content.stats" :key="i" class="pill">
              <span v-if="s.before">{{ s.before }}</span>
              <b>{{ s.strong }}</b>
              <span v-if="s.after">{{ s.after }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  z-index: 2;
  overflow-x: clip;
}

.inner {
  position: relative;
  display: grid;
  min-height: 640px;
  padding-block: 18px 40px;
}

.rec {
  position: relative;
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--line);
  font: 400 11px/1.4 var(--font-data);
  color: var(--ink-muted);
}

.name {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  column-gap: 0.18em;
  margin-top: 22px;
  font: 800 clamp(44px, 9.2vw, 136px)/0.9 var(--font-display);
  letter-spacing: -0.04em;
  text-transform: uppercase;
}

.word {
  display: inline-block;
  overflow: hidden;
  padding-block: 0.04em;
}

.word > span {
  display: inline-block;
}

.stack {
  position: absolute;
  z-index: 2;
  right: clamp(44px, 5vw, 72px);
  top: 104px;
  width: min(400px, 34vw);
}

.foot {
  position: relative;
  z-index: 3;
  align-self: end;
  display: grid;
  gap: 20px;
  max-width: calc(100% - min(400px, 34vw) - 120px);
  margin-top: 24px;
}

.intro {
  display: grid;
  gap: 14px;
  max-width: 420px;
}

.eyebrow {
  font: 400 11px/1.4 var(--font-data);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.lead {
  font: 700 28px/1.1 var(--font-display);
  letter-spacing: -0.02em;
}

.value {
  font-size: 16px;
}

.actions,
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.stats {
  margin: 0;
  padding: 0;
  list-style: none;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: var(--surface-raised);
  box-shadow: var(--shadow-pill);
  font: 600 13px/1.3 var(--font-body);
}

.pill b {
  font-family: var(--font-data);
}

@media (max-width: 899px) {
  .inner {
    min-height: 0;
  }

  .stack {
    position: relative;
    right: auto;
    top: auto;
    width: min(340px, 84%);
    margin: 40px 34px 0 auto;
  }

  .foot {
    max-width: none;
  }
}
</style>
