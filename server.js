import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 8080;

console.log("🚀 AISStream Proxy starting...");

wss.on('connection', (client) => {
  console.log('✅ Browser client connected');

  const ais = new WebSocket('wss://stream.aisstream.io/v0/stream');

  ais.on('open', () => {
    console.log('✅ Connected to aisstream.io');
    const subscription = {
      "APIKey": process.env.AIS_API_KEY,
      "BoundingBoxes": [[[49.5, -1.5], [52.5, 2.5]]],   // Change this if you want a different area
      "FilterMessageTypes": ["PositionReport"]
    };
    ais.send(JSON.stringify(subscription));
  });

  ais.on('message', (data) => {
    if (client.readyState === 1) client.send(data.toString());
  });

  client.on('close', () => ais.close());
  ais.on('close', () => client.close());

  ais.on('error', (err) => console.error('AIS Error:', err));
});

app.get('/', (req, res) => {
  res.send('AISStream Proxy is live! Connect via WebSocket.');
});

server.listen(PORT, () => {
  console.log(`✅ Listening on port ${PORT}`);
});