const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Token Bot Telegram kamu
const TOKEN = '8951330077:AAExKbMBCdLaBf9TFflW2jbhiGrGb77ch5s';

const bot = new TelegramBot(TOKEN, { polling: true });

console.log('Bot Downloader TikTok & YouTube aktif...');

// Command /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    '👋 **Halo! Selamat datang di Downloader Bot!**\n\n' +
    'Kirimkan link video **TikTok** atau **YouTube** (Shorts/Video), dan saya akan mengunduhkannya untukmu secara gratis!',
    { parse_mode: 'Markdown' }
  );
});

// Listener untuk pesan berisi teks (Link)
bot.on('text', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text.trim();

  // Abaikan perintah bawaan bot
  if (text.startsWith('/')) return;

  // Cek apakah teks berupa link TikTok
  if (text.includes('tiktok.com')) {
    await handleTikTok(chatId, text);
  } 
  // Cek apakah teks berupa link YouTube
  else if (text.includes('youtube.com') || text.includes('youtu.be')) {
    await handleYouTube(chatId, text);
  } 
  else {
    bot.sendMessage(chatId, '❌ Harap kirimkan tautan/link **TikTok** atau **YouTube** yang valid.');
  }
});

// --- FUNGSI DOWNLOAD TIKTOK ---
async function handleTikTok(chatId, url) {
  let statusMsg;
  try {
    statusMsg = await bot.sendMessage(chatId, '⏳ **Memproses video TikTok...**', { parse_mode: 'Markdown' });

    // Menggunakan API TikTok Downloader tanpa watermark
    const apiRes = await axios.get(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`);
    const data = apiRes.data;

    if (data && data.video && data.video.noWatermark) {
      await bot.editMessageText('📤 **Mengirim video ke Telegram...**', {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown'
      });

      // Kirim video langsung ke percakapan Telegram
      await bot.sendVideo(chatId, data.video.noWatermark, {
        caption: `✅ **TikTok No Watermark**\n\n📌 **Judul:** ${data.title || 'TikTok Video'}`
      });

      // Hapus pesan status
      bot.deleteMessage(chatId, statusMsg.message_id);
    } else {
      throw new Error('Video tidak ditemukan atau link tidak valid.');
    }
  } catch (error) {
    console.error('TikTok Error:', error.message);
    if (statusMsg) {
      bot.editMessageText('❌ **Gagal mengunduh video TikTok.** Pastikan akun/video tidak di-private.', {
        chat_id: chatId,
        message_id: statusMsg.message_id
      });
    }
  }
}

// --- FUNGSI DOWNLOAD YOUTUBE ---
async function handleYouTube(chatId, url) {
  let statusMsg;
  try {
    statusMsg = await bot.sendMessage(chatId, '⏳ **Memproses link YouTube...**', { parse_mode: 'Markdown' });

    // Menggunakan API Downloader YouTube
    const apiRes = await axios.get(`https://api.cobalt.tools/api/json`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        url: url,
        videoQuality: '720'
      })
    });

    const data = apiRes.data;

    if (data && data.url) {
      await bot.editMessageText('📤 **Mengirim video YouTube...**', {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown'
      });

      // Kirim video jika ukuran memungkinkan
      await bot.sendVideo(chatId, data.url, {
        caption: `✅ **YouTube Downloader**`
      });

      bot.deleteMessage(chatId, statusMsg.message_id);
    } else {
      throw new Error('Gagal mendapatkan link media YouTube.');
    }
  } catch (error) {
    console.error('YouTube Error:', error.message);
    if (statusMsg) {
      bot.editMessageText('❌ **Gagal mengunduh video YouTube.** Coba gunakan link YouTube Shorts atau video berdurasi pendek.', {
        chat_id: chatId,
        message_id: statusMsg.message_id
      });
    }
  }
}
