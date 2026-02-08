import { NextResponse } from 'next/server';
import { buildMapFromDecisionLLM, type DecisionInput } from '@/lib/map/engine';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DecisionInput;
    const result = await buildMapFromDecisionLLM(body);

    return NextResponse.json({
      map: result.map,
      extracted: result.extracted,
      llmUsed: result.llmUsed
    });
  } catch (error) {
    console.error('Ошибка API построения карты:', error);
    return NextResponse.json(
      { message: 'Ошибка построения карты на сервере.' },
      { status: 500 }
    );
  }
}
