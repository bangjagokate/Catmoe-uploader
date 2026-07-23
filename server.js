const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const FormData = require('form-data');

// Token Bot Telegram kamu
const TOKEN = '8951330077:AAExKbMBCdLaBf9TFflW2jbhiGrGb77ch5s';

const bot = new TelegramBot(TOKEN, { polling: true });

console.log('Bot Telegram Catbox Uploader aktif...');

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    '👋 **Halo!** Kirimkan foto, video, audio, atau dokumen, lalu saya akan mengunggahnya ke **Catbox.moe**!',
    { parse_mode: 'Markdown' }
  );
});

async function handleFileUpload(msg, fileId, defaultExt = 'jpg') {
  const chatId = msg.chat.id;
  let statusMsg;

  try {
    statusMsg = await bot.sendMessage(chatId, '⏳ Mengunduh file dari Telegram...');

    // 1. Ambil URL File dari Telegram
    const file = await bot.getFile(fileId);
    const fileUrlTelegram = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;

    const ext = file.file_path ? file.file_path.split('.').pop() : defaultExt;
    const fileName = `file_${Date.now()}.${ext}`;

    // 2. Download File ke Buffer
    const responseFile = await axios.get(fileUrlTelegram, {
      responseType: 'arraybuffer'
    });

    const fileBuffer = Buffer.from(responseFile.data);

    await bot.editMessageText('📤 Mengunggah ke Catbox.moe...', {
      chat_id: chatId,
      message_id: statusMsg.message_id
    });

    // 3. Susun FormData Khusus Catbox
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', fileBuffer, {
      filename: fileName,
      contentType: 'application/octet-stream'
    });

    let fileUrl = '';

    try {
      // Tembak API Catbox.moe
      const catboxRes = await axios.post('https://catbox.moe/user/api.php', formData, {
        headers: {
          ...formData.getHeaders(),
          'User-Agent': 'Mozilla/5.0'
        },
        timeout: 20000
      });

      fileUrl = String(catboxRes.data).trim();
    } catch (e) {
      console.log('Catbox gagal, mencoba alternatif Litterbox...');
    }

    // Jika Catbox memberikan error 'Invalid uploader' atau gagal, gunakan Litterbox (Layanan resmi dari Catbox)
    if (!fileUrl.startsWith('http')) {
      const litterFormData = new FormData();
      litterFormData.append('reqtype', 'fileupload');
      litterFormData.append('time', '72h'); // Simpan 3 hari
      litterFormData.append('fileToUpload', fileBuffer, {
        filename: fileName,
        contentType: 'application/octet-stream'
      });

      const litterRes = await axios.post('https://litterbox.catbox.moe/resources/internals/api.php', litterFormData, {
        headers: {
          ...litterFormData.getHeaders(),
          'User-Agent': 'Mozilla/5.0'
        }
      });

      fileUrl = String(litterRes.data).trim();
    }

    // 4. Kirim Hasil Link
    if (fileUrl.startsWith('http')) {
      await bot.editMessageText(`✅ **Berhasil Diunggah!**\n\n🔗 **Link File:**\n${fileUrl}`, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      });
    } else {
      throw new Error(`Respon Server: ${fileUrl}`);
    }

  } catch (error) {
    console.error('Error detail:', error.message);
    const errDetail = error.response && error.response.data ? String(error.response.data) : error.message;
    
    if (statusMsg) {
      bot.editMessageText(`❌ Gagal mengunggah file.\n\nDetail Error: \`${errDetail.slice(0, 100)}\``, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown'
      });
    }
  }
}

bot.on('photo', (msg) => {
  const photo = msg.photo[msg.photo.length - 1];
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
