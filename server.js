const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const FormData = require('form-data');

// Token Bot Telegram langsung dimasukkan ke dalam kode
const TOKEN = '8951330077:AAExKbMBCdLaBf9TFflW2jbhiGrGb77ch5s';

// Inisialisasi Bot dengan Polling
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('Bot Telegram sedang berjalan...');

// Handler pesan /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    '👋 Halo! Kirimkan saya **foto, video, audio, atau dokumen**, lalu saya akan mengunggahnya ke **Catbox.moe** dan memberikan tautannya untukmu!',
    { parse_mode: 'Markdown' }
  );
});

// Fungsi untuk mengunduh file dari Telegram dan mengunggah ke Catbox.moe
async function handleFileUpload(msg, fileId) {
  const chatId = msg.chat.id;
  
  try {
    const statusMsg = await bot.sendMessage(chatId, '⏳ Memproses dan mengunduh file dari Telegram...');

    // 1. Ambil URL file dari server Telegram
    const fileLink = await bot.getFileLink(fileId);

    // 2. Unduh file sebagai Stream
    const response = await axios({
      method: 'get',
      url: fileLink,
      responseType: 'stream'
    });

    await bot.editMessageText('📤 Mengunggah file ke Catbox.moe...', {
      chat_id: chatId,
      message_id: statusMsg.message_id
    });

    // 3. Siapkan Form Data untuk dikirim ke Catbox
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', response.data, {
      filename: `file_${Date.now()}`
    });

    // 4. Kirim request ke API Catbox.moe
    const catboxRes = await axios.post('https://catbox.moe/user/api.php', formData, {
      headers: formData.getHeaders()
    });

    const fileUrl = catboxRes.data;

    // 5. Kirim balasan berisi link Catbox
    await bot.sendMessage(chatId, `✅ **Berhasil Diunggah!**\n\n🔗 **Link File:**\n${fileUrl}`, {
      parse_mode: 'Markdown',
      disable_web_page_preview: false
    });

  } catch (error) {
    console.error('Error upload:', error.message);
    bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengunggah file ke Catbox.moe.');
  }
}

// Menangani pesan berisi dokumen / file biasa
bot.on('document', (msg) => {
  handleFileUpload(msg, msg.document.file_id);
});

// Menangani pesan berisi foto
bot.on('photo', (msg) => {
  const photo = msg.photo[msg.photo.length - 1];
  handleFileUpload(msg, photo.file_id);
});

// Menangani pesan berisi video
bot.on('video', (msg) => {
  handleFileUpload(msg, msg.video.file_id);
});

// Menangani pesan berisi audio / musik
bot.on('audio', (msg) => {
  handleFileUpload(msg, msg.audio.file_id);
});
