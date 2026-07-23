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
  bot.sendMessage(
    msg.chat.id,
    '👋 **Halo!** Kirimkan foto, video, audio, atau dokumen, lalu saya akan mengunggahnya ke **Catbox.moe**!',
    { parse_mode: 'Markdown' }
  );
});

// Fungsi utama penanganan upload menggunakan Buffer
async function handleFileUpload(msg, fileId, defaultExt = 'bin') {
  const chatId = msg.chat.id;
  let statusMsg;

  try {
    statusMsg = await bot.sendMessage(chatId, '⏳ Mengunduh file dari Telegram...');

    // 1. Dapatkan file path dari Telegram
    const file = await bot.getFile(fileId);
    const fileUrlTelegram = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;

    // Tentukan ekstensi & nama file
    const ext = file.file_path ? file.file_path.split('.').pop() : defaultExt;
    const fileName = `upload_${Date.now()}.${ext}`;

    // 2. Download file ke bentuk buffer di memori
    const responseFile = await axios.get(fileUrlTelegram, {
      responseType: 'arraybuffer'
    });

    await bot.editMessageText('📤 Mengunggah ke Catbox.moe...', {
      chat_id: chatId,
      message_id: statusMsg.message_id
    });

    // 3. Masukkan ke FormData
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', Buffer.from(responseFile.data), {
      filename: fileName
    });

    // 4. Kirim ke Catbox API
    const catboxRes = await axios.post('https://catbox.moe/user/api.php', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    const fileUrl = String(catboxRes.data).trim();

    if (fileUrl.startsWith('http')) {
      await bot.sendMessage(chatId, `✅ **Berhasil Diunggah!**\n\n🔗 **Link File:**\n${fileUrl}`, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      });
    } else {
      throw new Error(`Respon server Catbox: ${fileUrl}`);
    }

  } catch (error) {
    console.error('Error detail:', error.response ? error.response.data : error.message);
    if (statusMsg) {
      bot.editMessageText('❌ Terjadi kesalahan saat mengunggah file ke Catbox.moe.', {
        chat_id: chatId,
        message_id: statusMsg.message_id
      });
    } else {
      bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengunggah file.');
    }
  }
}

// Event handler untuk berbagai jenis media
bot.on('photo', (msg) => {
  const photo = msg.photo[msg.photo.length - 1]; // Resolusi paling tinggi
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
