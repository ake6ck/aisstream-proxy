import express from 'express';
import { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 10000;

console.log("🚀 AISStream Dynamic Proxy started on port", PORT);

wss.on('connection', (client) => {
  console.log('✅ Browser client connected');

  client.on('message', (message) => {
    try {
      const sub = JSON.parse(message.toString());
      console.log('📨 Received subscription:', JSON.stringify(sub, null, 2));

      if (!sub.APIKey) {
        client.send(JSON.stringify({ error: "Missing APIKey" }));
        return;
      }
      if (!sub.BoundingBoxes || !Array.isArray(sub.BoundingBoxes)) {
        client.send(JSON.stringify({ error: "Missing or invalid BoundingBoxes" }));
        return;
      }

      const ais = new WebSocket('wss://stream.aisstream.io/v0/stream');

      ais.on('open', () => {
        console.log('✅ Successfully connected to aisstream.io');
        ais.send(JSON.stringify(sub));
        client.send(JSON.stringify({ status: "Subscription sent to aisstream.io" }));
      });

      ais.on('message', (data) => {
        const strData = data.toString();
        console.log('📡 Received from aisstream:', strData.substring(0, 150) + '...');
        if (client.readyState === WebSocket.OPEN) {
          client.send(strData);
        }
      });

      ais.on('error', (err) => {
        console.error('❌ AISStream error:', err.message);
        client.send(JSON.stringify({ error: "AISStream error: " + err.message }));
      });

      ais.on('close', (code) => {
        console.log(`⚠️ AISStream connection closed with code ${code}`);
        client.close();
      });

      client.on('close', () => ais.close());

    } catch (err) {
      console.error('❌ Invalid message from browser:', err.message);
      client.send(JSON.stringify({ error: "Invalid JSON format" }));
    }
  });

  client.on('error', (err) => console.error('Client error:', err));
});

app.get('/', (req, res) => {
  res.send('AISStream Dynamic Proxy is running ✅ (v2 with debug)');
});

server.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
