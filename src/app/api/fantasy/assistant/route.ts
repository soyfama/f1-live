// API Route: POST /api/fantasy/assistant
// AI Fantasy Assistant with streaming support

import { NextRequest } from 'next/server';
import prices from '@/data/fantasy-prices.json';
import type { DriverPrice, ChatMessage } from '@/lib/fantasy-types';

export const dynamic = 'force-dynamic';

interface AssistantRequest {
  messages: ChatMessage[];
  budget?: number;
  currentTeam?: string[];
}

// Build system prompt with current data
function buildSystemPrompt(): string {
  const pricesText = prices.map((p: DriverPrice) => 
    `${p.acronym}: $${p.price}M (${p.team})`
  ).join(', ');
  
  return `Sos Pitwall AI, el asistente experto de F1 Fantasy 2026.

DATOS ACTUALES DE PRECIOS:
${pricesText}

REGLAS DEL JUEGO F1 FANTASY 2026:
- Budget: $100M para 5 pilotos + 1 constructor
- Máximo 2 pilotos del mismo equipo
- Puntos Qualifying: P1=10, P2=9, P3=8... P10=1, Q2=+1, Q1 elim=-1
- Puntos Carrera: P1=25, P2=18, P3=15... P10=1
- Fastest Lap: +5 (solo si top 10)
- Posiciones ganadas: +2 c/u | Perdidas: -1 c/u
- Vencer compañero: +3
- Pit stops extra (>1): -1 c/u
- DNF culpa piloto: -15 | DNF culpa auto: -10

Chips disponibles: Wildcard, Limitless, Mega Driver, No Negative, Extra DRS

Respondé de forma concisa, directa y con datos concretos. Si preguntan por equipo óptimo, sugerí pilotos con buen ratio puntos/precio.`;
}

// Rule-based fallback responses
function generateRuleBasedResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();
  
  // Detect intention
  if (msg.includes('equipo') || msg.includes('team') || msg.includes('armame')) {
    // Top 5 value picks
    const valuePicks = prices
      .sort((a, b) => (b.price - a.price) * -1) // Lower price first
      .slice(0, 5);
    
    return `🎯 **Top 5 Value Picks para tu equipo:**

1. **Antonelli (ANT)** - $16.5M - Mercedes, en ascenso 📈
2. **Albon (ALB)** - $15.0M - Williams, estable y confiable
3. **Lawson (LAW)** - $13.0M - Racing Bulls, buen precio
4. **Hadjar (HAD)** - $12.0M - Red Bull, gran potencial
5. **Ocon (OCO)** - $12.5M - Haas, underdog con puntos

**Sugerencia de equipo $100M:**
- Norris ($28M) + Piastri ($25M) + Antonelli ($16.5M) + Albon ($15M) + Lawson ($13M) = **$97.5M**

Te quedan $2.5M para ajustes. Este equipo balancea pilotos top con value picks en ascenso.`;
  }
  
  if (msg.includes('precio') || msg.includes('price') || msg.includes('subio') || msg.includes('bajo')) {
    const rising = prices.filter(p => {
      const change = p.price - p.history[p.history.length - 2];
      return change > 0;
    });
    const falling = prices.filter(p => {
      const change = p.price - p.history[p.history.length - 2];
      return change < 0;
    });
    
    return `💰 **Cambios de precio esta semana:**

**Subieron 🔥:**
${rising.map(p => `- ${p.name}: $${p.price}M (+$${(p.price - p.history[p.history.length - 2]).toFixed(1)}M)`).join('\n') || 'Ninguno'}

**Bajaron 📉:**
${falling.map(p => `- ${p.name}: $${p.price}M ($${(p.price - p.history[p.history.length - 2]).toFixed(1)}M)`).join('\n') || 'Ninguno'}

**Precio promedio de la grilla:** $${(prices.reduce((s, p) => s + p.price, 0) / prices.length).toFixed(1)}M`;
  }
  
  if (msg.includes('wildcard') || msg.includes('chip')) {
    return `🎲 **Sobre el Wildcard:**

El Wildcard te permite hacer cambios ilimitados en tu equipo sin penalización de cambios de precio.

**¿Cuándo usarlo?**
- Antes de carreras con mucha incertidumbre (clima, nuevas actualizaciones)
- Cuando varios pilotos de tu equipo tienen malas rondas seguidas
- Para aprovechar cambios de precio significativos

**Consejo:** Guardalo para un Sprint weekend o cuando haya safety cars probables (Baku, Mónaco, Singapur).`;
  }
  
  if (msg.includes('value') || msg.includes('mejor') || msg.includes('pick')) {
    // Calculate value score (mock recent points)
    const withValue = prices.map(p => {
      const recentPoints = p.price > 20 ? 25 : p.price > 15 ? 18 : p.price > 12 ? 12 : 8;
      return { ...p, valueScore: recentPoints / p.price };
    }).sort((a, b) => b.valueScore - a.valueScore);
    
    return `⭐ **Top Value Picks (puntos por millón):**

1. **${withValue[0].name}** - Value: ${withValue[0].valueScore.toFixed(2)} pts/$M
2. **${withValue[1].name}** - Value: ${withValue[1].valueScore.toFixed(2)} pts/$M  
3. **${withValue[2].name}** - Value: ${withValue[2].valueScore.toFixed(2)} pts/$M

Estos pilotos ofrecen más puntos por cada millón invertido. Ideales para completar tu equipo manteniendo presupuesto para estrellas.`;
  }
  
  // Default response
  return `🏁 **Pitwall AI a tu servicio**

Podés preguntarme sobre:
• El mejor equipo para este GP ("¿mejor equipo?")
• Cambios de precios ("¿quién subió?")
• Cuándo usar chips ("¿usar wildcard?")
• Value picks ("top value")

¿Qué necesitás saber?`;
}

// OpenAI streaming response
async function* openAIStream(messages: ChatMessage[], apiKey: string): AsyncGenerator<string> {
  const systemPrompt = buildSystemPrompt();
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      stream: true,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');
  
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AssistantRequest = await request.json();
    const { messages } = body;
    
    if (!messages || messages.length === 0) {
      return new Response('No messages provided', { status: 400 });
    }
    
    const lastMessage = messages[messages.length - 1];
    const apiKey = process.env.OPENAI_API_KEY;
    
    // Check if we should use OpenAI or fallback
    const useOpenAI = apiKey && apiKey.length > 10 && !apiKey.includes('placeholder');
    
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (useOpenAI) {
            // Stream from OpenAI
            for await (const chunk of openAIStream(messages, apiKey)) {
              const data = JSON.stringify({ type: 'text', content: chunk });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          } else {
            // Use rule-based response with simulated streaming
            const response = generateRuleBasedResponse(lastMessage.content);
            
            // Send word by word for streaming effect
            const words = response.split(' ');
            for (let i = 0; i < words.length; i++) {
              const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
              const data = JSON.stringify({ type: 'text', content: chunk });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              
              // Small delay for streaming effect
              await new Promise(r => setTimeout(r, 10));
            }
          }
          
          // Send done event
          controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
          controller.close();
          
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = JSON.stringify({ type: 'error', content: 'Error generating response' });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('Error in /api/fantasy/assistant:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
