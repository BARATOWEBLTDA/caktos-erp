import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, products } = await request.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'Imagem não fornecida' }, { status: 400 })
    }

    // Monta lista de produtos cadastrados para ajudar no match
    const productList = products.map((p: {
      id: string
      name: string
      sku: string | null
      purchase_price: number
      platforms: Array<{ platform_id: string; sale_price: number | null; is_active: boolean }>
      variations?: Array<{ id: string; name: string; sku: string | null }>
    }) => {
      const vars = p.variations?.map((v: { id: string; name: string; sku: string | null }) =>
        `    - Variação: "${v.name}" (SKU: ${v.sku ?? 'sem SKU'}, ID: ${v.id})`
      ).join('\n') ?? ''
      return `- Produto: "${p.name}" (SKU: ${p.sku ?? 'sem SKU'}, ID: ${p.id})\n${vars}`
    }).join('\n')

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
              },
            },
            {
              type: 'text',
              text: `Você é um assistente especializado em extrair dados de pedidos de e-commerce brasileiro.

Analise esta imagem de um pedido e extraia as informações. Esta pode ser uma tela da Shopee, TikTok Shop, Mercado Livre ou similar.

PRODUTOS CADASTRADOS NO SISTEMA (use para fazer o match):
${productList}

Retorne APENAS um JSON válido neste formato exato, sem texto adicional:
{
  "platform": "shopee" | "tiktok" | "mercadolivre" | "outro",
  "order_code": "código do pedido ou null",
  "discount": 0,
  "items": [
    {
      "product_id": "ID do produto cadastrado ou null se não encontrar",
      "variation_id": "ID da variação ou null",
      "product_name_found": "nome exato que aparece na imagem",
      "variation_name_found": "variação exata que aparece na imagem ou null",
      "sku_found": "SKU que aparece na imagem ou null",
      "quantity": 1,
      "unit_price": 0.00,
      "matched": true
    }
  ],
  "notes": "observações relevantes ou null"
}

Regras:
- Para fazer o match com produtos cadastrados, compare SKU primeiro (mais confiável), depois nome
- Se encontrar SKU idêntico, use o product_id e variation_id correspondente
- Se não encontrar match, deixe product_id e variation_id como null mas preencha product_name_found
- discount deve ser o valor total de cupons/descontos em reais (número positivo)
- unit_price é o preço unitário de cada item
- Retorne SOMENTE o JSON, nada mais`,
            },
          ],
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Limpar e parsear o JSON
    const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleanJson)

    return NextResponse.json({ success: true, data: parsed })
  } catch (error: unknown) {
    console.error('Erro ao processar imagem:', error)
    return NextResponse.json(
      { error: 'Erro ao processar imagem: ' + (error as Error).message },
      { status: 500 }
    )
  }
}