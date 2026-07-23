const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const FormData = require('form-data');

// Token Bot Telegram kamu
const TOKEN = '8951330077:AAExKbMBCdLaBf9TFflW2jbhiGrGb77ch5s';

// Inisialisasi Bot dengan Polling
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('Bot Telegram Catbox Uploader aktif...');

// Handler pesan /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    '👋 **Halo!** Kirimkan foto, video, audio, atau dokumen, lalu saya akan mengunggahnya ke **Catbox.moe**!',
    { parse_mode: 'Markdown' }
  );
});

// Fungsi penanganan upload ke Catbox.moe
async function handleFileUpload(msg, fileId, defaultExt = 'bin') {
  const chatId = msg.chat.id;
  let statusMsg;

  try {
    statusMsg = await bot.sendMessage(chatId, '⏳ Memproses file dari Telegram...');

    // 1. Dapatkan info file dan link dari Telegram
    const file = await bot.getFile(fileId);
    const fileLink = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;

    // Tentukan ekstensi & nama file
    const fileExtension = file.file_path ? file.file_path.split('.').pop() : defaultExt;
    const fileName = `upload_${Date.now()}.${fileExtension}`;

    await bot.editMessageText('📤 Mengunggah file ke Catbox.moe...', {
      chat_id: chatId,
      message_id: statusMsg.message_id
    });

    // 2. Unduh file sebagai ArrayBuffer / Buffer
    const fileBufferResponse = await axios.get(fileLink, {
      responseType: 'arraybuffer'
    });

    // 3. Siapkan Form Data sesuai spesifikasi API Catbox.moe
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', Buffer.from(fileBufferResponse.data), {
      filename: fileName
    });

    // 4. Kirim ke API Catbox.moe
    const catboxRes = await axios.post('https://catbox.moe/user/api.php', formData, {
      headers: {
        ...formData.getHeaders(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const fileUrl = String(catboxRes.data).trim();

    // Pastikan respon berupa URL valid Catbox
    if (fileUrl.startsWith('http')) {
      await bot.sendMessage(chatId, `✅ **Berhasil Diunggah!**\n\n🔗 **Link File:**\n${fileUrl}`, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      });
    } else {
      throw new Error(`Respon Catbox tidak valid: ${fileUrl}`);
    }

  } catch (error) {
    console.error('Error upload:', error.response ? error.response.data : error.message);
    
    if (statusMsg) {
      bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengunggah file ke Catbox.moe.');
    }
  }
}

// Event Listeners untuk berbagai tipe media
bot.on('photo', (msg) => {
  const photo = msg.photo[msg.photo.length - 1]; // Ambil kualitas tertinggi
  handleFileUpload(msg, photo.file_id, 'jpg');
});

bot.on('document', (msg) => {
  handleFileUpload(msg, msg.document.file_id, 'bin');
});

bot.on('video', (msg) => {
  handleFileUpload(msg, msg.video.file_id, 'mp4');
});

bot.on('audio', (msg) => {
  handleFileUpload(msg, msg.audio.file_id, 'mp3');
});

bot.on('voice', (msg) => {
  handleFileUpload(msg, msg.voice.file_id, 'ogg');
});
