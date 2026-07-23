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

// Fungsi utama penanganan upload
async function handleFileUpload(msg, fileId, defaultExt = 'bin') {
  const chatId = msg.chat.id;
  let statusMsg;

  try {
    statusMsg = await bot.sendMessage(chatId, '⏳ Memproses file dari Telegram...');

    // 1. Ambil stream file langsung dari Telegram
    const fileStream = bot.getFileStream(fileId);

    // 2. Dapatkan info nama file/ekstensi dari Telegram jika ada
    const fileInfo = await bot.getFile(fileId);
    const ext = fileInfo.file_path ? fileInfo.file_path.split('.').pop() : defaultExt;
    const fileName = `upload_${Date.now()}.${ext}`;

    await bot.editMessageText('📤 Mengunggah file ke Catbox.moe...', {
      chat_id: chatId,
      message_id: statusMsg.message_id
    });

    // 3. Buat FormData dan masukkan stream
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', fileStream, {
      filename: fileName,
      knownLength: fileInfo.file_size
    });

    // 4. Kirim stream langsung ke Catbox.moe
    const response = await axios.post('https://catbox.moe/user/api.php', formData, {
      headers: {
        ...formData.getHeaders(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    const fileUrl = String(response.data).trim();

    // 5. Cek jika berhasil mendapat URL Catbox
    if (fileUrl.startsWith('http')) {
      await bot.sendMessage(chatId, `✅ **Berhasil Diunggah!**\n\n🔗 **Link File:**\n${fileUrl}`, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      });
    } else {
      throw new Error(`Respon Catbox: ${fileUrl}`);
    }

  } catch (error) {
    console.error('Error detail:', error.message);
    bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengunggah file ke Catbox.moe. Pastikan ukuran file tidak melebihi limit (20MB).');
  }
}

// Event handler untuk media
bot.on('photo', (msg) => {
  const photo = msg.photo[msg.photo.length - 1]; // foto resolusi tertinggi
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
