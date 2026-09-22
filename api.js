import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

export default async function handler(req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-admin-code',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    };

    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
        if (req.method === 'GET') {
            const demons = await kv.get('demons_v3') || [];
            return new Response(JSON.stringify(demons), { headers: corsHeaders });
        }

        if (req.method === 'POST') {
            if (req.headers.get('x-admin-code') !== '090909') {
                return new Response(JSON.stringify({ success: false, error: 'Denied' }), { status: 403, headers: corsHeaders });
            }

            const body = await req.json();
            let demons = await kv.get('demons_v3') || [];

            if (req.url.endsWith('/delete')) {
                demons = demons.filter(d => d.id !== body.id);
            } else if (req.url.endsWith('/add-victor')) {
                const demon = demons.find(d => d.id === body.id);
                if (demon) {
                    if (!demon.victors) demon.victors = [];
                    demon.victors.push({ name: body.name, percent: parseInt(body.percent), video: body.video });
                }
            } else {
                if (body.id) {
                    const demon = demons.find(d => d.id === body.id);
                    if (demon) {
                        demon.position = parseInt(body.position); demon.name = body.name;
                        demon.creator = body.creator; demon.verifier = body.verifier; demon.minPercent = parseInt(body.minPercent);
                    }
                } else {
                    demons.push({
                        id: "id_" + Date.now(), position: parseInt(body.position), name: body.name,
                        creator: body.creator, verifier: body.verifier || 'Не указан', minPercent: parseInt(body.minPercent), victors: []
                    });
                }
            }

            demons.sort((a, b) => a.position - b.position);
            await kv.set('demons_v3', demons);
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
}
