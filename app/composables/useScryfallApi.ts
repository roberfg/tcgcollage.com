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
        try {
            if (set && number) {
                const card = await $fetch<ScryfallCard>(`${BASE}/${set.toLowerCase()}/${number}`)
                const result = extractCard(card)
                return result ? [result] : []
            }

            const params: Record<string, string> = { exact: name }
            if (set) params.set = set.toLowerCase()
            const card = await $fetch<ScryfallCard>(`${BASE}/named`, { params })

            const result = extractCard(card)
            return result ? [result] : []
        } catch {
            return []
        }
    }

    return { searchCards }
}