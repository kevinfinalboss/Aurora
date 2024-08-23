const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

const originalStdoutWrite = process.stdout.write;
const originalStderrWrite = process.stderr.write;

process.stdout.write = (...args) => {
    if (!args.some(arg => typeof arg === 'string' && arg.includes('onnxruntime'))) {
        originalStdoutWrite.apply(process.stdout, args);
    }
};

process.stderr.write = (...args) => {
    if (!args.some(arg => typeof arg === 'string' && arg.includes('onnxruntime'))) {
        originalStderrWrite.apply(process.stderr, args);
    }
};

process.env.ONNX_LOG_LEVEL = '4';

const SUPPORTED_AUDIO_TYPES = [
    'audio/mpeg', // .mp3
    'audio/wav',  // .wav
    'audio/ogg',  // .ogg
    'audio/x-m4a' // .m4a
];

let pipeline;

module.exports = {
    name: 'transcrever',
    description: 'Transcreve um arquivo de áudio para texto',
    options: [
        {
            name: 'audio',
            type: ApplicationCommandOptionType.Attachment,
            description: 'O arquivo de áudio para transcrever (suporta mp3, wav, ogg, m4a)',
            required: true
        }
    ],
    
    async run(client, interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!pipeline) {
            const { pipeline: pipelineImport } = await import('@xenova/transformers');
            pipeline = pipelineImport;
        }

        const audioAttachment = interaction.options.getAttachment('audio');

        if (!audioAttachment) {
            return sendEmbed(interaction, 'Erro', 'Por favor, forneça um arquivo de áudio.', 'error');
        }

        if (!SUPPORTED_AUDIO_TYPES.includes(audioAttachment.contentType)) {
            return sendEmbed(interaction, 'Erro', `Tipo de arquivo não suportado. Por favor, envie um arquivo de áudio nos formatos: mp3, wav, ogg ou m4a.\nTipo recebido: ${audioAttachment.contentType}`, 'error');
        }

        try {
            await sendEmbed(interaction, 'Processando', '🔄 Processando a transcrição do áudio... Por favor, aguarde.', 'info');

            const audioBuffer = await downloadAudio(audioAttachment.url);
            const wavBuffer = await convertToWav(audioBuffer, audioAttachment.contentType);
            const transcription = await transcribeAudio(wavBuffer);

            if (transcription.trim().length === 0) {
                return sendEmbed(interaction, 'Resultado', 'Não foi possível detectar fala neste áudio.', 'warning');
            }

            const resultEmbed = new EmbedBuilder()
                .setColor('#00A859')
                .setTitle('🎙️ Resultado da Transcrição')
                .setDescription(transcription.length > 4096 ? transcription.slice(0, 4093) + '...' : transcription)
                .addFields(
                    { name: '📊 Estatísticas', value: `Caracteres: ${transcription.length}\nPalavras: ${transcription.split(/\s+/).length}` },
                    { name: '📁 Arquivo Original', value: `Nome: ${audioAttachment.name}\nTipo: ${audioAttachment.contentType}` }
                )
                .setTimestamp()
                .setFooter({ 
                    text: `Solicitado por ${interaction.user.tag}`, 
                    iconURL: client.user.displayAvatarURL()
                });

            await interaction.editReply({ embeds: [resultEmbed] });
        } catch (error) {
            console.error('Erro ao transcrever áudio:', error);
            await sendEmbed(interaction, 'Erro', 'Ocorreu um erro ao processar o áudio. Por favor, tente novamente.', 'error');
        }
    }
};

async function downloadAudio(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'binary');
}

async function convertToWav(audioBuffer, contentType) {
    return new Promise((resolve, reject) => {
        const inputStream = require('stream').Readable.from(audioBuffer);
        let outputBuffer = [];

        let ffmpegCommand = ffmpeg(inputStream)
            .inputFormat(contentType.split('/')[1])
            .audioCodec('pcm_s16le')
            .format('s16le')
            .outputOptions('-ac 1')
            .outputOptions('-ar 16000')
            .on('error', (err) => {
                reject(err);
            })
            .on('end', () => {
                resolve(Buffer.concat(outputBuffer));
            });

        if (contentType === 'audio/mpeg') {
            ffmpegCommand.inputOptions('-f mp3');
        } else if (contentType === 'audio/ogg') {
            ffmpegCommand.inputOptions('-f ogg');
        } else if (contentType === 'audio/x-m4a') {
            ffmpegCommand.inputOptions('-f m4a');
        }

        const stream = ffmpegCommand.pipe();
        stream.on('data', chunk => outputBuffer.push(chunk));
        stream.on('error', reject);
    });
}

async function transcribeAudio(audioBuffer) {
    const floatArray = new Float32Array(audioBuffer.length / 2);
    for (let i = 0; i < floatArray.length; i++) {
        const int16 = audioBuffer.readInt16LE(i * 2);
        floatArray[i] = int16 / 32768.0;
    }

    const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small');
    const result = await transcriber(floatArray, { 
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'portuguese',
        task: 'transcribe'
    });
    return result.text;
}

async function sendEmbed(interaction, title, description, type = 'info') {
    const colors = {
        info: '#0099ff',
        success: '#00ff00',
        warning: '#ffff00',
        error: '#ff0000'
    };

    const embed = new EmbedBuilder()
        .setColor(colors[type])
        .setTitle(title)
        .setDescription(description)
        .setTimestamp()
        .setFooter({ 
            text: `Solicitado por ${interaction.user.tag}`, 
            iconURL: interaction.client.user.displayAvatarURL()
        });

    await interaction.editReply({ embeds: [embed] });
}
