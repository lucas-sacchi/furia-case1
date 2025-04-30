const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();
const open = require('open').default;
const path = require("path");

let twitchAccessToken = "";

// Atualiza o token da Twitch
async function refreshTwitchToken() {
  try {
    const response = await axios.post(
      `https://id.twitch.tv/oauth2/token`,
      null,
      {
        params: {
          client_id: process.env.TWITCH_CLIENT_ID,
          client_secret: process.env.TWITCH_CLIENT_SECRET,
          grant_type: "client_credentials",
        },
      }
    );

    twitchAccessToken = response.data.access_token;
    console.log("✅ Novo token da Twitch obtido com sucesso.");
  } catch (error) {
    console.error("❌ Erro ao renovar token da Twitch:", error.response?.data || error.message);
  }
}

refreshTwitchToken();
setInterval(refreshTwitchToken, 60 * 60 * 1000); // a cada 1 hora

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const twitchChannels = [
  "furiatv",
  "guerri",
  "kscerato",
  "yuurih",
  "fallen",
  "chelo",
  "skullzin",
  "sofiaespanha"
];

// Verifica quais canais estão ao vivo
async function getLiveChannels(channels) {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const liveChannels = [];

  for (const channel of channels) {
    try {
      const response = await axios.get(`https://api.twitch.tv/helix/streams?user_login=${channel}`, {
        headers: {
          "Client-ID": clientId,
          "Authorization": `Bearer ${twitchAccessToken}`,
        },
      });

      if (response.data.data.length > 0) {
        liveChannels.push({
          name: channel,
          title: response.data.data[0].title,
          url: `https://www.twitch.tv/${channel}`
        });
      }
    } catch (err) {
      console.error(`Erro verificando canal ${channel}:`, err.response?.data || err.message);
    }
  }

  return liveChannels;
}

app.use(express.static(path.join(__dirname, "public")));

// Endpoint principal do chatbot
app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;

  const predefinedResponses = {
    "ver lives agora": async () => {
      const liveChannels = await getLiveChannels(twitchChannels);
      if (liveChannels.length === 0) {
        return "Nenhum canal da FURIA está ao vivo no momento. 😢 Volte mais tarde!";
      }
      return liveChannels.map(ch => `🔴 ${ch.name} — *${ch.title}* → ${ch.url}`).join("\n\n");
    },
    "loja da furia": async () => {
      return "Confira a loja oficial da Pantera aqui: https://www.furia.gg 👕🔥";
    },
    "últimos jogos": async () => {
      return "Acompanhe os jogos recentes e próximos no site oficial: https://draft5.gg/equipe/330-FURIA 📅";
    }
  };

  const cleanMsg = userMessage.trim().toLowerCase();

  // Verifica comandos pré-definidos
  if (predefinedResponses[cleanMsg]) {
    const result = await predefinedResponses[cleanMsg]();
    return res.json({ response: result });
  }

  // Resposta direta sobre lives
  const wantsLiveInfo = /quem.*(ao vivo|em live)|lives da furia|tá em live/i.test(userMessage);

  if (wantsLiveInfo) {
    const liveChannels = await getLiveChannels(twitchChannels);

    if (liveChannels.length === 0) {
      return res.json({ response: "Nenhum criador ou canal da FURIA está ao vivo no momento. 😢 Volte mais tarde!" });
    }

    const formatted = liveChannels.map(ch => `🔴 ${ch.name} — *${ch.title}* → ${ch.url}`).join("\n\n");
    return res.json({ response: `Esses são os canais da FURIA que estão AO VIVO agora:\n\n${formatted}` });
  }

  try {
    const liveChannels = await getLiveChannels(twitchChannels);

    let liveInfo = "Nenhum canal da FURIA está online no momento.";
    if (liveChannels.length > 0) {
      liveInfo = "Os seguintes canais da FURIA estão AO VIVO agora:\n\n" +
        liveChannels.map(ch => `🔴 ${ch.name} — *${ch.title}* → ${ch.url}`).join("\n\n");
    }

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `
Você é o bot oficial da FURIA Esports. Seu foco é exclusivamente o time de CS:GO e o universo da FURIA (jogadores, partidas, fãs, conteúdos e cultura gamer). Responda de forma amigável, divertida e criativa.

Contexto atual:
📺 Status das lives na Twitch:
${liveInfo}

Regras:
- Time atual titular: MOLODOY, YEKINDAR FalleN, BRKSCERATO, yuurih e os reservas são: skullz e chelo
- Se o usuário perguntar sobre lives, use o contexto acima.
- Se o usuário perguntar sobre jogadores, partidas, ou curiosidades, responda com base na cultura e universo FURIA ESPORTS.
- Use emojis e linguagem descontraída.

Nunca fale sobre assuntos fora da FURIA. Se o usuário perguntar algo irrelevante, diga que só responde sobre a Pantera.
            `
          },
          {
            role: "user",
            content: `
Mensagem do usuário: ${userMessage}

📺 Status atual das lives na Twitch:
${liveInfo}
            `
          }
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "furia-chatbot",
        },
      }
    );

    res.json({ response: response.data.choices[0].message.content });
  } catch (error) {
    console.error("Erro ao processar a mensagem:", error.response?.data || error.message);
    res.status(500).json({ error: "Erro ao processar mensagem" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  (async () => {
    await open(`http://localhost:${PORT}`);
  })();
});

