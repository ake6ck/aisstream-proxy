import express from 'express';
import { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 10000;

console.log("🚀 AISStream Dynamic Proxy starting...");

wss.on('connection', (client) => {
  console.log('✅ Browser client connected');

  let ais = null;

  // Wait for subscription message from browser
  client.on('message', (message) => {
    try {
      const subscription = JSON.parse(message.toString());

      // Must contain APIKey and BoundingBoxes
      if (!subscription.APIKey || !subscription.BoundingBoxes) {
        client.send(JSON.stringify({ error: "APIKey and BoundingBoxes are required" }));
        return;
      }

      console.log('📨 Received subscription from user');

      // Connect to aisstream.io using the user's own API key
      ais = new WebSocket('wss://stream.aisstream.io/v0/stream');

      ais.on('open', () => {
        console.log('✅ Connected to aisstream.io with user API key');
        ais.send(JSON.stringify(subscription));   // forward exactly what user sent
      });

      ais.on('message', (data) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data.toString());
        }
      });

      ais.on('close', () => client.close());
      client.on('close', () => ais && ais.close());

    } catch (err) {
      console.error("Invalid subscription message:", err);
      client.send(JSON.stringify({ error: "Invalid JSON" }));
    }
  });

  client.on('error', (err) => console.error('Client Error:', err));
});

// Health check
app.get('/', (req, res) => res.send('AISStream Dynamic Proxy is running ✅'));

server.listen(PORT, () => {
  console.log(`✅ Listening on port ${PORT}`);
});
