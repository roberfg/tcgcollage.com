interface ScryfallImageUris {
    png?: string
    normal?: string
    large?: string
}

interface ScryfallCard {
    id: string
    name: string
    image_uris?: ScryfallImageUris
    card_faces?: { image_uris?: ScryfallImageUris }[]
}

export interface CardResult {
    id: string
    name: string
    imageUrl: string
}

interface CachedCardResult {
    cards: CardResult[]
    timestamp: number
}

const CARD_CACHE_KEY = 'mtg_card_cache'
const CARD_CACHE_TTL = 24 * 60 * 60 * 1000

const getCardCache = (): Map<string, CachedCardResult> => {
    if (typeof localStorage === 'undefined') return new Map()
    try {
        const raw = localStorage.getItem(CARD_CACHE_KEY)
        return raw ? new Map(JSON.parse(raw)) : new Map()
    } catch {
        return new Map()
    }
}

const cardCache = getCardCache()

const persistCardCache = () => {
    if (typeof localStorage === 'undefined') return
    try {
        const now = Date.now()
        const expired = [...cardCache.entries()].filter(([_, v]) => now - v.timestamp > CARD_CACHE_TTL)
        expired.forEach(([k]) => cardCache.delete(k))
        localStorage.setItem(CARD_CACHE_KEY, JSON.stringify([...cardCache]))
    } catch {}
}

const getCacheKey = (name: string, set?: string, number?: string): string => {
    return `${name.toLowerCase()}|${set?.toLowerCase() || ''}|${number || ''}`
}

export const useScryfallApi = () => {
    const BASE = 'https://api.scryfall.com/cards'

    const extractCard = (card: ScryfallCard): CardResult | null => {
        const imageUris = card.image_uris || card.card_faces?.[0]?.image_uris
        if (!imageUris?.large && !imageUris?.normal) return null
        return {
            id: card.id,
            name: card.name,
            imageUrl: imageUris?.large || imageUris?.normal || imageUris?.png || ''
        }
    }

    const searchCards = async (name: string, set?: string, number?: string): Promise<CardResult[]> => {
        const cacheKey = getCacheKey(name, set, number)
        const cached = cardCache.get(cacheKey)

        if (cached && Date.now() - cached.timestamp < CARD_CACHE_TTL) {
            return cached.cards
        }

        try {
            if (set && number) {
                const card = await $fetch<ScryfallCard>(`${BASE}/${set.toLowerCase()}/${number}`)
                const result = extractCard(card)
                if (result) {
                    cardCache.set(cacheKey, { cards: [result], timestamp: Date.now() })
                    persistCardCache()
                    return [result]
                }
                return []
            }

            const params: Record<string, string> = { exact: name }
            if (set) params.set = set.toLowerCase()
            const card = await $fetch<ScryfallCard>(`${BASE}/named`, { params })

            const result = extractCard(card)
            if (result) {
                cardCache.set(cacheKey, { cards: [result], timestamp: Date.now() })
                persistCardCache()
                return [result]
            }

            if (!set && !number) {
                const fallbackKey = name.toLowerCase()
                for (const [key, value] of cardCache.entries()) {
                    const parts = key.split('|')
                    if (parts[0] === fallbackKey && parts[1] === '' && parts[2] === '' && Date.now() - value.timestamp < CARD_CACHE_TTL) {
                        return [value.cards[0]]
                    }
                }
            }

            return []
        } catch {
            if (!set && !number) {
                const fallbackKey = name.toLowerCase()
                for (const [key, value] of cardCache.entries()) {
                    const parts = key.split('|')
                    if (parts[0] === fallbackKey && parts[1] === '' && parts[2] === '' && Date.now() - value.timestamp < CARD_CACHE_TTL) {
                        return [value.cards[0]]
                    }
                }
            }
            return []
        }
    }

    return { searchCards }
}
