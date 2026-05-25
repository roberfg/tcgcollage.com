<script setup lang="ts">
useSeoMeta({
  title: 'Collage Magic: The Gathering — TCG Collage',
  description: 'Genera collages visuales de tus cartas y mazos de Magic: The Gathering de forma rápida y bonita, para compartir con la comunidad.',
  ogTitle: 'Collage Magic: The Gathering — TCG Collage',
  ogDescription: 'Genera collages visuales de tus cartas y mazos de Magic: The Gathering de forma rápida y bonita, para compartir con la comunidad.',
  ogImage: 'https://tcgcollage.com/og-image.png',
  ogUrl: 'https://tcgcollage.com/collage-magic',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

const { t } = useLocale()
const { searchCards } = useScryfallApi()
const { generate, download, downloadAll, downloadPDF } = useCollageGenerator()

const deckList = ref('')
const deck = ref<{ id: string; name: string; imageUrl: string; quantity: number }[]>([])
const canvasRef = ref<HTMLCanvasElement | null>(null)
const status = ref('')
const loading = ref(false)
const generating = ref(false)
const collageReady = ref(false)

const showOverlay = computed(() => loading.value || generating.value)
const notFound = ref<string[]>([])

const cols = ref(3)
const gap = ref(5)
const bg = ref('#1a1a1a')
const badgeColor = ref('#c0392b')
const borderColor = ref('#ffffff')
const badgeShape = ref<'circle' | 'diamond' | 'hexagon'>('hexagon')
const multipleFiles = ref(false)
const multiRows = ref(3)

const parseDeckList = (text: string) => {
  const lines = text.trim().split('\n').filter(l => l.trim())
  return lines.map(line => {
    const withQuotes = line.match(/(\d+),\s*"([^"]+)"(?:\s*,\s*(\S+)(?:\s*,\s*(\S+))?)?/)
    if (withQuotes) {
      return { quantity: parseInt(withQuotes[1]), name: withQuotes[2], set: withQuotes[3] || undefined, number: withQuotes[4] || undefined }
    }
    const withSet = line.match(/^(\d+)\s+(.+?)\s+\((\w+)(?:-(\S+))?\)\s*$/)
    if (withSet) {
      return { quantity: parseInt(withSet[1]), name: withSet[2], set: withSet[3], number: withSet[4] || undefined }
    }
    const simple = line.match(/^(\d+)\s+(.+)$/)
    if (!simple) return null
    return { quantity: parseInt(simple[1]), name: simple[2], set: undefined, number: undefined }
  }).filter(Boolean) as { quantity: number; name: string; set?: string; number?: string }[]
}

const processDeckList = async () => {
  if (!deckList.value.trim()) return

  loading.value = true
  collageReady.value = false
  status.value = t('processing')
  notFound.value = []
  deck.value = []

  try {
    const parsed = parseDeckList(deckList.value)
    const total = parsed.length
    let processed = 0

    const results: ({ id: string; name: string; imageUrl: string; quantity: number } | null)[] = new Array(total).fill(null)

    for (let i = 0; i < parsed.length; i += 4) {
      const batch = parsed.slice(i, i + 4)
      await Promise.all(batch.map(async (item, batchIdx) => {
        const origIdx = i + batchIdx
        try {
          const cards = await searchCards(item.name, item.set, item.number)
          if (cards && cards.length > 0) {
            const card = cards[0]
            results[origIdx] = { id: card.id, name: card.name, imageUrl: card.imageUrl, quantity: Math.min(60, item.quantity) }
          } else {
            notFound.value.push(item.name)
          }
        } catch (e) {
          notFound.value.push(item.name)
        } finally {
          processed++
          status.value = t('processing_progress', { processed, total })
        }
      }))
    }

    const seen = new Map<string, number>()
    for (const result of results) {
      if (!result) continue
      if (seen.has(result.id)) {
        deck.value[seen.get(result.id)!].quantity = Math.min(60, deck.value[seen.get(result.id)!.quantity + result.quantity])
      } else {
        seen.set(result.id, deck.value.length)
        deck.value.push(result)
      }
    }

    status.value = t('cards_loaded', { count: deck.value.length })
    if (notFound.value.length > 0) {
      status.value += `, ${t('not_found_count', { count: notFound.value.length })}`
    }
  } catch (e) {
    status.value = t('error_processing')
  } finally {
    loading.value = false
  }
}

const removeCard = (id: string) => {
  deck.value = deck.value.filter(c => c.id !== id)
}

const onGenerate = async () => {
  if (!canvasRef.value || deck.value.length === 0) return
  status.value = t('generating')
  generating.value = true
  await generate(
    canvasRef.value,
    deck.value,
    { cols: cols.value, gap: gap.value, bg: bg.value, badgeColor: badgeColor.value, borderColor: borderColor.value, badgeShape: badgeShape.value },
    undefined,
    multipleFiles.value ? multiRows.value : undefined
  )
  generating.value = false
  collageReady.value = true
  status.value = t('collage_ready')
}

  const onDownload = async () => {
    if (multipleFiles.value) {
      status.value = t('generating')
      generating.value = true
      await downloadAll(deck.value, { cols: cols.value, gap: gap.value, bg: bg.value, badgeColor: badgeColor.value, borderColor: borderColor.value, badgeShape: badgeShape.value }, 'magic', multiRows.value)
      generating.value = false
    } else {
      if (canvasRef.value) download(canvasRef.value, 'magic')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onDownloadPDF = async () => {
    if (deck.value.length === 0) return
    status.value = t('generating_pdf')
    generating.value = true
    await downloadPDF(
      deck.value,
      { gap: gap.value, bg: bg.value, badgeColor: badgeColor.value, borderColor: borderColor.value, badgeShape: badgeShape.value },
      'magic',
      (msg) => { status.value = msg }
    )
    generating.value = false
    status.value = t('pdf_ready')
  }
</script>

<template>
  <div class="flex-1 p-4 sm:p-6">
    <LoadingOverlay :visible="showOverlay" :message="status" />
    <div class="max-w-6xl mx-auto">

      <div class="flex items-center gap-4 mb-6">
        <NuxtLink to="/" class="text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-white">{{ t('home') }}</NuxtLink>
        <h1 class="text-2xl font-bold">{{ t('collage_magic_title') }}</h1>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div class="space-y-4">
          <div class="    bg-brand-200 dark:bg-brand-900 rounded-xl p-4">
            <p class="text-sm text-brand-500 dark:text-brand-400 mb-3">{{ t('enter_cards') }}</p>
            <p class="text-xs text-brand-400 dark:text-brand-600 mb-2">{{ t('formats_magic') }}</p>
            <textarea
              v-model="deckList"
              placeholder='1 Get Out
2 Lightning Bolt (M21)
1 Harmonized Crescendo (ECL-408)
1,"Counterspell",EMA
1,"Harmonized Crescendo",ECL,408'
              class="w-full h-48 bg-brand-100 dark:bg-brand-800 rounded-lg px-3 py-2 text-sm outline-none font-mono"
            />
            <button
              class="mt-3 w-full py-2 bg-brand-500 rounded-lg text-sm hover:bg-brand-400 disabled:opacity-40"
              :disabled="loading || !deckList.trim()"
              @click="processDeckList"
            >
              {{ loading ? t('processing') : t('process_list') }}
            </button>
          </div>

          <div class="    bg-brand-200 dark:bg-brand-900 rounded-xl p-4">
            <p class="text-sm text-brand-500 dark:text-brand-400 mb-3">{{ t('deck_title') }} ({{ deck.length }} {{ t('cards_unique') }})</p>
            <div class="space-y-2 max-h-48 overflow-y-auto">
              <div v-for="card in deck" :key="card.id" class="flex items-center gap-3">
                <img :src="card.imageUrl" :alt="card.name" class="w-10 rounded" />
                <span class="flex-1 text-sm">{{ card.name }}</span>
                <div class="flex items-center gap-2">
                  <button class="w-6 h-6 bg-brand-100 dark:bg-brand-800 rounded text-xs" @click="card.quantity = Math.max(1, card.quantity - 1)">-</button>
                  <span class="text-sm w-4 text-center">{{ card.quantity }}</span>
                  <button class="w-6 h-6 bg-brand-100 dark:bg-brand-800 rounded text-xs" @click="card.quantity = Math.min(60,card.quantity + 1)">+</button>
                  <button class="w-6 h-6 bg-red-800 rounded text-xs" @click="removeCard(card.id)">x</button>
                </div>
              </div>
            </div>
          </div>

          <div class="    bg-brand-200 dark:bg-brand-900 rounded-xl p-4">
            <p class="text-sm text-brand-500 dark:text-brand-400 mb-3">{{ t('settings') }}</p>
            <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <label class="flex items-center justify-between">
                <span class="text-brand-500 dark:text-brand-400">{{ t('columns') }}</span>
                <input v-model.number="cols" type="number" min="1" max="10" class="w-16 bg-brand-100 dark:bg-brand-800 rounded px-2 py-1 text-center" />
              </label>
              <label class="flex items-center justify-between">
                <span class="text-brand-500 dark:text-brand-400">{{ t('gap') }} (px)</span>
                <input v-model.number="gap" type="number" min="0" max="40" class="w-16 bg-brand-100 dark:bg-brand-800 rounded px-2 py-1 text-center" />
              </label>
              <label class="flex items-center justify-between">
                <span class="text-brand-500 dark:text-brand-400">{{ t('background') }}</span>
                <input v-model="bg" type="color" class="w-10 h-8 rounded cursor-pointer" />
              </label>
              <label class="flex items-center justify-between">
                <span class="text-brand-500 dark:text-brand-400">{{ t('circle') }}</span>
                <input v-model="badgeColor" type="color" class="w-10 h-8 rounded cursor-pointer" />
              </label>
              <label class="flex items-center justify-between">
                <span class="text-brand-500 dark:text-brand-400">{{ t('border') }}</span>
                <input v-model="borderColor" type="color" class="w-10 h-8 rounded cursor-pointer" />
              </label>
              <label class="flex items-center justify-between">
                <span class="text-brand-500 dark:text-brand-400">{{ t('badge') }}</span>
                <select v-model="badgeShape" class="w-20 bg-brand-100 dark:bg-brand-800 rounded px-2 py-1">
                  <option value="circle">{{ t('circle') }}</option>
                  <option value="diamond">{{ t('diamond') }}</option>
                  <option value="hexagon">{{ t('hexagon') }}</option>
                </select>
              </label>
            </div>
            <span class="text-xs text-brand-400 dark:text-brand-600 mt-2 block">{{ t('columns_hint') }}</span>
            <div class="mt-3">
              <span class="text-brand-500 dark:text-brand-400 text-sm block mb-1">{{ t('download_mode') }}</span>
              <div class="flex gap-2">
                <button @click="multipleFiles = true" :disabled="deck.length < 10" :class="multipleFiles ? 'bg-brand-500 border-white' : 'bg-brand-100 dark:bg-brand-800 border-brand-300 dark:border-brand-600'" class="flex-1 px-3 py-1.5 text-sm rounded border disabled:opacity-40 disabled:cursor-not-allowed">{{ t('download_multiple') }}</button>
                <button @click="multipleFiles = false" :class="!multipleFiles ? 'bg-brand-500 border-white' : 'bg-brand-100 dark:bg-brand-800 border-brand-300 dark:border-brand-600'" class="flex-1 px-3 py-1.5 text-sm rounded border">{{ t('download_single') }}</button>
              </div>
              <div v-if="multipleFiles" class="flex items-center gap-2 mt-2">
                <span class="text-brand-500 dark:text-brand-400 text-sm">{{ t('rows') }}</span>
                <input v-model.number="multiRows" type="number" min="1" max="10" class="w-16 bg-brand-100 dark:bg-brand-800 rounded px-2 py-1 text-sm" />
              </div>
              <p class="text-xs text-brand-400 dark:text-brand-600 mt-1">{{ t('download_multiple_hint') }}</p>
            </div>
          </div>

          <div class="flex gap-3">
            <button
              class="flex-1 py-3 bg-brand-500 rounded-xl font-medium hover:bg-brand-400 disabled:opacity-40"
              :disabled="deck.length === 0 || loading"
              @click="onGenerate"
            >
              {{ t('generate_collage') }}
            </button>
            <button
              class="flex-1 py-3 bg-brand-300 dark:bg-brand-700 rounded-xl font-medium hover:bg-brand-400 dark:hover:bg-brand-600 disabled:opacity-40"
              :disabled="!collageReady"
              @click="onDownload"
            >
              {{ t('download_png') }}
            </button>
            <button
              class="flex-1 py-3 bg-brand-300 dark:bg-brand-700 rounded-xl font-medium hover:bg-brand-400 dark:hover:bg-brand-600 disabled:opacity-40"
              :disabled="!collageReady"
              @click="onDownloadPDF"
            >
              {{ t('download_pdf') }}
            </button>
          </div>

          <p class="text-sm text-brand-500 dark:text-brand-400">{{ status }}</p>
          <div v-if="notFound.length > 0" class="text-sm text-red-400">
            {{ t('not_found_label') }}: {{ notFound.join(', ') }}
          </div>
        </div>

        <div class="    bg-brand-200 dark:bg-brand-900 rounded-xl p-4 overflow-auto">
          <p class="text-sm text-brand-500 dark:text-brand-400 mb-3">
            {{ (() => {
              const actualCols = Math.min(cols, deck.length || 1)
              const displayRows = multipleFiles ? multiRows : Math.ceil(deck.length / actualCols)
              const filesCount = multipleFiles ? Math.ceil(deck.length / (actualCols * multiRows)) : 1
              const filesLabel = filesCount === 1 ? t('preview_files', { count: filesCount }) : t('preview_files_plural', { count: filesCount })
              return `${t('preview')} — ${actualCols} ${t('preview_cols')} × ${displayRows} ${t('preview_rows')} · ${filesLabel}`
            })() }}
          </p>
          <canvas ref="canvasRef" class="rounded max-w-full" />
        </div>

      </div>
    </div>
  </div>
</template>
