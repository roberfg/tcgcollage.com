interface PokemonTcgCard {
    id: string
    name: string
    images: {
        small: string
        large: string
    }
}

interface PokemonTcgSet {
    id: string
}

interface PokemonTcgResponse<T> {
    data: T[]
}

interface CachedCardResult {
    cards: CardResult[]
    timestamp: number
}

const SET_STORAGE_KEY = 'ptcg_set_id_cache'
const CARD_CACHE_KEY = 'ptcg_card_cache'
const CARD_CACHE_TTL = 24 * 60 * 60 * 1000

const loadStoredSetCache = (): Map<string, string> => {
    if (typeof localStorage === 'undefined') return new Map()
    try {
        const raw = localStorage.getItem(SET_STORAGE_KEY)
        return raw ? new Map(JSON.parse(raw)) : new Map()
    } catch {
        return new Map()
    }
}

const setIdCache = loadStoredSetCache()

const persistSetCache = () => {
    if (typeof localStorage === 'undefined') return
    try {
        localStorage.setItem(SET_STORAGE_KEY, JSON.stringify([...setIdCache]))
    } catch {}
}

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

const getCacheKey = (name: string, setId?: string, number?: string): string => {
    return `${name.toLowerCase()}|${setId || ''}|${number || ''}`
}

export const usePokemonTcgApi = () => {
    const BASE = 'https://api.pokemontcg.io/v2'

    const getSetIdByPtcgoCode = async (ptcgoCode: string): Promise<string | null> => {
        if (setIdCache.has(ptcgoCode)) {
            return setIdCache.get(ptcgoCode)!
        }

        try {
            const data = await $fetch<PokemonTcgResponse<PokemonTcgSet>>(`${BASE}/sets`, {
                params: {
                    q: `ptcgoCode:${ptcgoCode}`,
                    pageSize: 1
                }
            })

            if (data.data && data.data.length > 0) {
                const setId = data.data[0].id
                setIdCache.set(ptcgoCode, setId)
                persistSetCache()
                return setId
            }
        } catch (e) {
            console.error(`Error fetching set ID for ${ptcgoCode}:`, e)
            throw e
        }

        return null
    }

    const searchCards = async (name: string, ptcgoCode?: string, number?: string): Promise<CardResult[]> => {
        const cacheKey = getCacheKey(name, ptcgoCode, number)
        const cached = cardCache.get(cacheKey)

        if (cached && Date.now() - cached.timestamp < CARD_CACHE_TTL) {
            return cached.cards
        }

        const quotedName = `"${name}"`
        let query = `name:${quotedName}`

        if (ptcgoCode && number) {
            const setId = await getSetIdByPtcgoCode(ptcgoCode)
            if (setId) {
                query = `name:${quotedName} set.id:${setId} number:${number}`
            } else {
                query = `name:${quotedName} number:${number}`
            }
        }

        const data = await $fetch<PokemonTcgResponse<PokemonTcgCard>>(`${BASE}/cards`, {
            params: {
                q: query,
                pageSize: 12
            }
        })

        const toResults = (cards: PokemonTcgCard[]): CardResult[] => {
            const results = cards.map(card => ({
                id: card.id,
                name: card.name,
                imageUrl: card.images.large ?? card.images.small
            }))
            const exactMatch = results.find(c => c.name.toLowerCase() === name.toLowerCase())
            return exactMatch ? [exactMatch, ...results.filter(c => c !== exactMatch)] : results
        }

        if (data.data.length > 0) {
            const results = toResults(data.data)
            cardCache.set(cacheKey, { cards: results, timestamp: Date.now() })
            persistCardCache()
            return results
        }

        if (ptcgoCode && number) {
            const fallbackData = await $fetch<PokemonTcgResponse<PokemonTcgCard>>(`${BASE}/cards`, {
                params: {
                    q: `name:${quotedName} number:${number}`,
                    pageSize: 12
                }
            })
            if (fallbackData.data.length > 0) {
                const results = toResults(fallbackData.data)
                cardCache.set(cacheKey, { cards: results, timestamp: Date.now() })
                persistCardCache()
                return results
            }
        }

        if (!ptcgoCode && !number) {
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

    const warmSetCache = async (ptcgoCodes: string[]): Promise<void> => {
        const unique = [...new Set(ptcgoCodes.filter(Boolean))]
        await Promise.all(unique.map(code => getSetIdByPtcgoCode(code).catch(() => null)))
    }

    return { searchCards, warmSetCache }
}
