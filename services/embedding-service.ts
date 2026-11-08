import ai from '@/lib/gemini'
import { VECTOR_SIZE } from '@/lib/qdrant'

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: text
    })
    
    // The response returns an array of embeddings, usually we just need the first one
    if (response.embeddings && response.embeddings.length > 0 && response.embeddings[0].values) {
      return response.embeddings[0].values
    }

    if ((response as any).embedding?.values) {
      return (response as any).embedding.values
    }
    
    throw new Error('No embedding values returned')
  } catch (error) {
    console.error('Error generating embedding, using zero-vector fallback:', error)
    return new Array(VECTOR_SIZE).fill(0)
  }
}
