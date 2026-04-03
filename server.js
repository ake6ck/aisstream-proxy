import express from 'express';
import { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 10000;

console.log("🚀 AISStream Dynamic Proxy started on port", PORT);

wss.on('connection', (client) => {
  console.log('✅ Browser client connected');
  let aisConnection = null;

  client.on('message', (message) => {
    try {
      const sub = JSON.parse(message.toString());
      console.log('📨 Received subscription from browser:');
      console.log(JSON.stringify(sub, null, 2));

      // Validate subscription
      if (!sub.APIKey) {
        const error = { error: "Missing APIKey" };
        console.log('❌ Validation failed: Missing APIKey');
        client.send(JSON.stringify(error));
        return;
      }

      if (!sub.BoundingBoxes || !Array.isArray(sub.BoundingBoxes) || sub.BoundingBoxes.length === 0) {
        const error = { error: "Missing or invalid BoundingBoxes" };
        console.log('❌ Validation failed: Invalid BoundingBoxes');
        client.send(JSON.stringify(error));
        return;
      }

      // Close previous AIS connection if exists
      if (aisConnection) {
        console.log('Closing previous AISStream connection...');
        aisConnection.close();
      }

      // Connect to AISStream
      console.log('🔗 Connecting to aisstream.io...');
      aisConnection = new WebSocket('wss://stream.aisstream.io/v0/stream');

      aisConnection.on('open', () => {
        console.log('✅ Successfully connected to aisstream.io');
        console.log('📤 Sending subscription to aisstream.io...');
        aisConnection.send(JSON.stringify(sub));
        client.send(JSON.stringify({ status: "✅ Subscription sent to aisstream.io" }));
      });

      aisConnection.on('message', (data) => {
        try {
          const strData = data.toString();
          const parsedData = JSON.parse(strData);

          // Log position reports
          if (parsedData.MessageType === "PositionReport") {
            const mmsi = parsedData.Message?.PositionReport?.UserID;
            const shipName = parsedData.MetaData?.ShipName || 'Unknown';
            console.log(`📡 PositionReport: ${shipName} (MMSI: ${mmsi})`);
          }

          // Forward to browser client if connection is open
          if (client.readyState === WebSocket.OPEN) {
            client.send(strData);
          } else {
            console.log('⚠️ Browser client not open, message dropped');
          }
        } catch (e) {
          console.error('❌ Error processing AISStream message:', e.message);
        }
      });

      aisConnection.on('error', (err) => {
        console.error('❌ AISStream connection error:', err.message);
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ error: `AISStream error: ${err.message}` }));
        }
      });

      aisConnection.on('close', (code) => {
        console.log(`⚠️ AISStream connection closed with code ${code}`);
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ status: `⚠️ AISStream connection closed (code ${code})` }));
        }
      });

    } catch (err) {
      console.error('❌ Error parsing browser message:', err.message);
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ error: "Invalid JSON format" }));
      }
    }
  });

  client.on('close', () => {
    console.log('⚠️ Browser client disconnected');
    if (aisConnection) {
      aisConnection.close();
    }
  });

  client.on('error', (err) => {
    console.error('❌ Browser client error:', err.message);
  });
});

// Serve static files
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

server.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log(`🌐 Access at http://localhost:${PORT}`);
});
