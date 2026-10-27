// Cloudflare Pages Function: /api/room
// Manages real-time room synchronization for Smart TVs and Mobile Remotes without any external server

const rooms = new Map();

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const roomId = (url.searchParams.get('id') || '').toUpperCase().trim();

  if (!roomId) {
    return new Response(JSON.stringify({ success: false, error: 'ID da sala obrigatório' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // 1. Check in-memory map
  let room = rooms.get(roomId);

  // 2. Fallback to Cloudflare Edge Cache if not in local instance memory
  if (!room) {
    try {
      const cache = caches.default;
      const cacheKey = new Request(`https://connectasperus-cache.internal/room/${roomId}`);
      const cachedRes = await cache.match(cacheKey);
      if (cachedRes) {
        room = await cachedRes.json();
        rooms.set(roomId, room);
      }
    } catch (e) {
      // cache match non-fatal
    }
  }

  return new Response(JSON.stringify({ 
    success: true, 
    room: room || {
      roomId,
      playlist: [],
      currentIndex: 0,
      isPlaying: true,
      timerSeconds: 5,
      updatedAt: 0
    }
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    const roomId = (data.roomId || '').toUpperCase().trim();

    if (!roomId) {
      return new Response(JSON.stringify({ success: false, error: 'ID da sala obrigatório' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    let room = rooms.get(roomId) || {
      roomId,
      playlist: [],
      currentIndex: 0,
      isPlaying: true,
      timerSeconds: 5,
      fitMode: 'contain',
      updatedAt: Date.now()
    };

    if (Array.isArray(data.playlist)) room.playlist = data.playlist;
    if (typeof data.currentIndex === 'number') room.currentIndex = data.currentIndex;
    if (typeof data.isPlaying === 'boolean') room.isPlaying = data.isPlaying;
    if (typeof data.timerSeconds === 'number') room.timerSeconds = data.timerSeconds;
    if (typeof data.fitMode === 'string') room.fitMode = data.fitMode;
    room.updatedAt = Date.now();

    rooms.set(roomId, room);

    // Persist to Cloudflare Edge Cache
    try {
      const cache = caches.default;
      const cacheKey = new Request(`https://connectasperus-cache.internal/room/${roomId}`);
      const cacheRes = new Response(JSON.stringify(room), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=86400' // cache for 24h
        }
      });
      context.waitUntil(cache.put(cacheKey, cacheRes));
    } catch (cacheErr) {
      // non-fatal
    }

    return new Response(JSON.stringify({ success: true, room }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}
