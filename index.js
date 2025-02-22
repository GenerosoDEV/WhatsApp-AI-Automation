const { Client, LocalAuth } = require('whatsapp-web.js');
const qr = require('qrcode-terminal');
const fs = require("fs")

const client = new Client({
    authTimeoutMs: 20000,
    takeoverOnConflict: true,
    authStrategy: new LocalAuth(),
    restartOnAuthFail: true,
    puppeteer: {
        ignoreDefaultArgs: ['--enable-automation', '--disable-dev-shm-usage'],
        headless: true,
        args: ['--no-sandbox', '--disable-gpu-driver-bug-workarounds', '--disable-setuid-sandbox', '--unhandled-rejections=strict', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu', '--log-level=3', '--no-default-browser-check', '--disable-site-isolation-trials', '--no-experiments', '--ignore-gpu-blacklist', '--ignore-certificate-errors', '--ignore-certificate-errors-spki-list', '--disable-extensions', '--disable-default-apps', '--enable-features=NetworkService', '--disable-webgl', '--disable-threaded-animation', '--disable-threaded-scrolling', '--disable-in-process-stack-traces', '--disable-histogram-customizer', '--disable-gl-extensions', '--disable-composited-antialiasing', '--disable-canvas-aa', '--disable-3d-apis', '--disable-accelerated-jpeg-decoding', '--disable-accelerated-mjpeg-decode', '--disable-app-list-dismiss-on-blur', '--disable-accelerated-video-decode']
    },
});

client.on('qr', async (qrData) => {
    console.log(qrData)
    qr.generate(qrData, { small: true }, function (qrCode) {
        console.log(qrCode);
    });
});

client.on('ready', () => {
    console.log('You are connected!');
});

client.on('message_create', async (message) => {
    const chat = await message.getChat()
    if (chat.isGroup) {
        return
    }

    if (message.from === "status@broadcast") { return }
    if (!["text", "chat", "audio", "ptt", "voice", "image", "video", "document", "sticker"].includes(message.type)) { return }

    if (message.fromMe) {
        let body = {
            model: "gpt-4o",
            messages: [
                { role: "system", content: "Você se chama Flávio e é um desenvolvedor full-stack de 18 anos. Responda as mensagens do WhatsApp (que você irá receber) de forma descontraída" },
            ]
        }

        fs.readFile('conversationsBodys.json', 'utf8', (err, data) => {
            let jsonData = JSON.parse(data);
            if (!jsonData[message.to]) {
                jsonData[message.to] = body
            }

            jsonData[message.to].messages.push({ role: "assistant", content: message.body })

            body = jsonData[message.to]
            fs.writeFile('conversationsBodys.json', JSON.stringify(jsonData, null, 2), 'utf8', (err) => { });
        })
        return
    }

    if (["audio", "ptt", "voice"].includes(message.type)) {
        // Enviar p/ IA analisar
    } else if (["image", "video", "sticker"].includes(message.type)) {
        // Enviar p/ IA analisar
    } else if (["document"].includes(message.type)) {
        // Verificar tipo do documento e se possível enviar p/ IA
    } else {
        if (message.hasMedia) {
            // Add Logica    
        }

        let body = {
            model: "gpt-4o",
            messages: [
                { role: "system", content: "Você se chama Flávio e é um desenvolvedor full-stack de 18 anos. Responda as mensagens do WhatsApp (que você irá receber) de forma descontraída" },
            ]
        }

        const data = fs.readFileSync('conversationsBodys.json', 'utf8');

        let jsonData = JSON.parse(data);

        if (!jsonData[message.from]) {
            jsonData[message.from] = body;
        }

        jsonData[message.from].messages.push({ role: "user", content: message.body });

        body = jsonData[message.from];

        fs.writeFileSync('conversationsBodys.json', JSON.stringify(jsonData, null, 2), 'utf8');

        const response = await generateAITextResponse(body)

        await chat.sendMessage(response)
    }

});

async function generateAITextResponse(body) {
    try {
        const response = await fetch('http://127.0.0.1:1337/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const jsonResponse = await response.json();

        const choices = jsonResponse.choices || [];

        let message = undefined

        choices.forEach(choice => {
            const messageContent = choice?.message?.content || '';
            message = messageContent
        });
        return message;

    } catch (er) {
    }
}

client.initialize();