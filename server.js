import express from 'express';
import { WebSocket } from 'ws';           // ← Fixed import for client
import { WebSocketServer } from 'ws';     // ← For the server
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 10000;

console.log("🚀 AISStream Proxy starting...");

wss.on('connection', (client) => {
  console.log('✅ Browser client connected');

  // Connect to aisstream.io
  const ais = new WebSocket('wss://stream.aisstream.io/v0/stream');

  ais.on('open', () => {
    console.log('✅ Connected to aisstream.io');

    const subscription = {
      "APIKey": process.env.AIS_API_KEY,
      "BoundingBoxes": [[[49.5, -1.5], [52.5, 2.5]]],   // English Channel
      "FilterMessageTypes": ["PositionReport"]
    };

    ais.send(JSON.stringify(subscription));
  });

  ais.on('message', (data) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data.toString());
    }
  });

  // Clean up on disconnect
  client.on('close', () => ais.close());
  ais.on('close', () => client.close());

  ais.on('error', (err) => console.error('AIS Error:', err));
  client.on('error', (err) => console.error('Client Error:', err));
});

// Health check
app.get('/', (req, res) => {
  res.send('AISStream Proxy is running! ✅');
});

server.listen(PORT, () => {
  console.log(`✅ Listening on port ${PORT}`);
});
