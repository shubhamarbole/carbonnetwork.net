const net = require('net');

const MQTT_PORT = process.env.MQTT_PORT || 1883;

let server = null;
let aedesInstance = null;
const connectedClients = new Set();
const recentMessages = [];

async function startMQTTBroker() {
  if (server) return server;

  try {
    const aedesModule = await import('aedes');
    const AedesClass = aedesModule.Aedes || aedesModule.default?.Aedes || aedesModule.default;
    aedesInstance = new AedesClass();

    server = net.createServer(aedesInstance.handle);

    server.listen(MQTT_PORT, function () {
      console.log(`📡 [MQTT Broker] Embedded Aedes MQTT Broker listening on TCP port ${MQTT_PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️ [MQTT Broker] Port ${MQTT_PORT} in use. Embedded broker sharing existing listener.`);
      } else {
        console.error('❌ [MQTT Broker Error]:', err.message);
      }
    });

    // Client connected
    aedesInstance.on('client', function (client) {
      connectedClients.add(client.id);
      console.log(`🔌 [MQTT Broker] Client connected: ${client.id} (Total: ${connectedClients.size})`);
    });

    // Client disconnected
    aedesInstance.on('clientDisconnect', function (client) {
      connectedClients.delete(client.id);
      console.log(`🔌 [MQTT Broker] Client disconnected: ${client.id}`);
    });

    // Message published to broker
    aedesInstance.on('publish', async function (packet, client) {
      if (packet && packet.topic && !packet.topic.startsWith('$SYS/')) {
        const payloadStr = packet.payload ? packet.payload.toString() : '';
        recentMessages.unshift({
          topic: packet.topic,
          payload: payloadStr,
          qos: packet.qos,
          clientId: client ? client.id : 'system-internal',
          timestamp: new Date().toISOString()
        });
        if (recentMessages.length > 50) recentMessages.pop();
      }
    });
  } catch (err) {
    console.error('❌ [MQTT Broker Initialization Error]:', err.message);
  }

  return server;
}

function getMQTTStats() {
  return {
    port: MQTT_PORT,
    activeClients: connectedClients.size,
    clients: Array.from(connectedClients),
    recentMessages: recentMessages.slice(0, 20)
  };
}

module.exports = {
  startMQTTBroker,
  getMQTTStats
};
