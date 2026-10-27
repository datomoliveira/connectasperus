// Cloudflare Pages Function: /api/upload
// Free Cloud Image & Video Uploader via ImgBB, Freeimage and Catbox APIs

export async function onRequestPost(context) {
  try {
    const formData = await context.request.formData();
    const files = formData.getAll('files').length > 0 ? formData.getAll('files') : [formData.get('file')].filter(Boolean);

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Nenhum arquivo enviado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const uploadedItems = [];

    for (const file of files) {
      const isVideo = (file.type || '').startsWith('video/');
      let publicUrl = '';

      // 1. Try ImgBB for Images
      if (!isVideo) {
        try {
          const imgbbForm = new FormData();
          imgbbForm.append('image', file);
          const imgbbRes = await fetch('https://api.imgbb.com/1/upload?key=2d93e176313702a0a2df3801f46f34e6', {
            method: 'POST',
            body: imgbbForm
          });
          if (imgbbRes.ok) {
            const data = await imgbbRes.json();
            if (data?.data?.url) {
              publicUrl = data.data.url;
            }
          }
        } catch (e) {
          console.warn('ImgBB falhou, tentando fallback:', e);
        }
      }

      // 2. Try Catbox for Videos or Image fallback
      if (!publicUrl) {
        try {
          const catboxForm = new FormData();
          catboxForm.append('reqtype', 'fileupload');
          catboxForm.append('fileToUpload', file);
          const catboxRes = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: catboxForm
          });
          if (catboxRes.ok) {
            const text = (await catboxRes.text()).trim();
            if (text.startsWith('http')) {
              publicUrl = text;
            }
          }
        } catch (e) {
          console.warn('Catbox falhou:', e);
        }
      }

      // 3. If cloud hostings are unreachable, convert to Data URL fallback
      if (!publicUrl) {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        publicUrl = `data:${file.type || (isVideo ? 'video/mp4' : 'image/jpeg')};base64,${base64}`;
      }

      uploadedItems.push({
        id: 'media_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        type: isVideo ? 'video' : 'image',
        name: file.name,
        url: publicUrl,
        duration: isVideo ? 0 : 5
      });
    }

    return new Response(JSON.stringify({ success: true, items: uploadedItems }), {
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
