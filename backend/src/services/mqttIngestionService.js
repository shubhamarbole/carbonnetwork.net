const mqtt = require('mqtt');
const { 
  ElectricityReading, EmissionRecord, EmissionFactor, WaterRecord, 
  WasteRecord, PollutionRecord, EnvironmentalAlert, AuditLog
} = require('../../models/models');

const { calculateScope2CO2e, calculateConsumption } = require('../../services/calculationEngine');

let mqttClient = null;
const ingestionLogs = [];

async function handleTelemetryPacket(topic, data) {
  const logEntry = {
    topic,
    payload: data,
    receivedAt: new Date().toISOString(),
    status: 'PROCESSING'
  };

  // Topic convention: esg/{organizationId}/{facilityId}/{module}/{deviceId}
  const parts = topic.split('/');
  if (parts.length >= 5 && parts[0] === 'esg') {
    const organizationId = parts[1];
    const facilityId = parts[2];
    const moduleType = parts[3].toLowerCase();
    const deviceId = parts[4];

    if (moduleType === 'energy') {
      await processEnergyTelemetry(organizationId, facilityId, deviceId, data);
      logEntry.status = 'INGESTED_ENERGY';
    } else if (moduleType === 'water') {
      await processWaterTelemetry(organizationId, facilityId, deviceId, data);
      logEntry.status = 'INGESTED_WATER';
    } else if (moduleType === 'pollution') {
      await processPollutionTelemetry(organizationId, facilityId, deviceId, data);
      logEntry.status = 'INGESTED_POLLUTION';
    } else if (moduleType === 'waste') {
      await processWasteTelemetry(organizationId, facilityId, deviceId, data);
      logEntry.status = 'INGESTED_WASTE';
    }
  }

  ingestionLogs.unshift(logEntry);
  if (ingestionLogs.length > 50) ingestionLogs.pop();
  return logEntry;
}

function startIngestionService() {
  const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';
  mqttClient = mqtt.connect(MQTT_URL, {
    clientId: `esg-backend-ingestion-${Math.random().toString(16).substring(2, 8)}`,
    clean: true,
    reconnectPeriod: 2000
  });

  mqttClient.on('connect', () => {
    console.log('📥 [MQTT Ingestion Service] Connected to MQTT broker. Subscribing to "esg/#"...');
    mqttClient.subscribe('esg/#', (err) => {
      if (err) console.error('❌ [MQTT Ingestion] Subscribe failed:', err.message);
      else console.log('✅ [MQTT Ingestion] Actively listening on wildcard topic "esg/#"');
    });
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const payloadStr = message.toString();
      let data = {};
      try {
        data = JSON.parse(payloadStr);
      } catch (e) {
        data = { raw: payloadStr };
      }
      await handleTelemetryPacket(topic, data);
    } catch (err) {
      console.error('❌ [MQTT Ingestion Error]:', err.message);
    }
  });

  mqttClient.on('error', (err) => {
    console.warn('⚠️ [MQTT Client Warning]:', err.message);
  });

  return mqttClient;
}

// 1. Process Energy Telemetry
async function processEnergyTelemetry(organizationId, facilityId, meterNumber, data) {
  const curr = parseFloat(data.currentReading || data.reading || 0);
  const prevReadingDoc = await ElectricityReading.findOne({ organizationId, facilityId }).sort({ readingDate: -1, createdAt: -1 });
  const prev = prevReadingDoc ? (prevReadingDoc.currentReading || 0) : Math.max(0, curr - 100);
  const consumption = data.consumption ? parseFloat(data.consumption) : calculateConsumption(curr, prev);

  const reading = await ElectricityReading.create({
    organizationId,
    facilityId: facilityId || 'fac-main',
    meterId: meterNumber,
    previousReading: prev,
    currentReading: curr,
    consumption: Math.max(0, consumption),
    readingDate: data.timestamp ? data.timestamp.split('T')[0] : new Date().toISOString().split('T')[0],
    unit: data.unit || 'kWh',
    sourceType: data.sourceType || 'GRID',
    usageCategory: data.usageCategory || 'PRODUCTION_MACHINERY',
    reportingPeriod: data.reportingPeriod || 'Quarterly',
    dataQuality: 'Imported',
    status: 'SUBMITTED',
    submittedAt: new Date().toISOString(),
    createdBy: `mqtt-telemetry-${meterNumber}`
  });

  if (reading.sourceType === 'GRID') {
    const factorRecord = await EmissionFactor.findOne({ category: 'Scope 2', isActive: true }) || { value: 0.82, unit: 'kg CO2e / kWh', source: 'Standard Factor' };
    const calculatedCO2e = calculateScope2CO2e(reading.consumption, factorRecord.value);

    await EmissionRecord.create({
      organizationId,
      facilityId: facilityId || 'fac-main',
      scope: 2,
      category: 'Purchased electricity',
      sourceName: `Grid Smart Meter [${meterNumber}]`,
      activityValue: reading.consumption,
      activityUnit: 'kWh',
      emissionFactor: factorRecord.value,
      factorUnit: factorRecord.unit,
      factorSource: factorRecord.source,
      calculatedCO2e,
      reportingPeriod: reading.reportingPeriod,
      periodStart: reading.readingDate,
      periodEnd: reading.readingDate,
      dataQuality: 'Imported',
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
      createdBy: `mqtt-telemetry-${meterNumber}`
    });
  }

  await AuditLog.create({
    organizationId,
    user: `mqtt://${meterNumber}`,
    action: 'IoT Telemetry Ingested',
    module: 'Energy',
    recordId: reading._id.toString(),
    newValue: JSON.stringify({ currentReading: curr, consumption }),
    timestamp: new Date().toISOString()
  });

  console.log(`⚡ [MQTT Ingestion] Ingested Smart Energy Reading: ${consumption} kWh for Org: ${organizationId}`);
}

// 2. Process Water Telemetry
async function processWaterTelemetry(organizationId, facilityId, deviceId, data) {
  const consumption = parseFloat(data.consumption || data.flowVolume || 10);
  const record = await WaterRecord.create({
    organizationId,
    facilityId: facilityId || 'fac-main',
    source: data.source || 'Municipal Water',
    previousReading: parseFloat(data.previousReading || 0),
    currentReading: parseFloat(data.currentReading || consumption),
    consumption,
    unit: data.unit || 'm3',
    reportingPeriod: data.reportingPeriod || 'Quarterly',
    periodStart: new Date().toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
    dataQuality: 'Imported',
    status: 'SUBMITTED',
    submittedAt: new Date().toISOString(),
    createdBy: `mqtt-sensor-${deviceId}`
  });

  await AuditLog.create({
    organizationId,
    user: `mqtt://${deviceId}`,
    action: 'IoT Water Telemetry Ingested',
    module: 'Water',
    recordId: record._id.toString(),
    newValue: JSON.stringify({ consumption }),
    timestamp: new Date().toISOString()
  });

  console.log(`💧 [MQTT Ingestion] Ingested Water Telemetry: ${consumption} m3 for Org: ${organizationId}`);
}

// 3. Process Pollution Telemetry
async function processPollutionTelemetry(organizationId, facilityId, sensorId, data) {
  const actualValue = parseFloat(data.actualValue || data.value || 0);
  const legalLimit = parseFloat(data.legalLimit || 60);
  const pollutantType = data.pollutantType || 'PM2.5';
  const medium = data.medium || 'Air';
  const complianceStatus = actualValue > legalLimit ? 'NON_COMPLIANT' : 'COMPLIANT';

  const record = await PollutionRecord.create({
    organizationId,
    facilityId: facilityId || 'fac-main',
    medium,
    pollutantType,
    quantity: actualValue,
    unit: data.unit || 'µg/m3',
    source: `IoT Sensor ${sensorId}`,
    legalLimit,
    actualValue,
    complianceStatus,
    reportingPeriod: 'Quarterly',
    date: new Date().toISOString().split('T')[0],
    severity: actualValue > legalLimit ? 'Critical' : 'Low',
    status: 'Open',
    createdBy: `mqtt-sensor-${sensorId}`
  });

  if (complianceStatus === 'NON_COMPLIANT') {
    await EnvironmentalAlert.create({
      organizationId,
      facilityId: facilityId || 'fac-main',
      severity: 'Critical',
      type: 'IoT Threshold Limit Exceeded',
      relatedRecord: record._id.toString(),
      message: `🚨 [MQTT Live Alert]: ${pollutantType} in ${medium} exceeded statutory limit (${actualValue} vs limit ${legalLimit} ${data.unit || 'µg/m3'}) recorded by sensor ${sensorId}.`,
      createdAt: new Date().toISOString()
    });
    console.warn(`🚨 [MQTT Alert] Sensor ${sensorId} reported statutory breach: ${actualValue} vs ${legalLimit}`);
  }
}

// 4. Process Waste Telemetry
async function processWasteTelemetry(organizationId, facilityId, binId, data) {
  const quantity = parseFloat(data.quantity || data.weight || 20);
  await WasteRecord.create({
    organizationId,
    facilityId: facilityId || 'fac-main',
    category: data.category || 'General',
    wasteType: data.wasteType || 'NON_HAZARDOUS',
    quantity,
    amount: quantity,
    unit: data.unit || 'kg',
    disposalMethod: data.disposalMethod || 'Recycling',
    vendor: data.vendor || 'IoT Smart Bin Ingestion',
    reportingPeriod: 'Quarterly',
    periodStart: new Date().toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
    dataQuality: 'Imported',
    status: 'SUBMITTED',
    submittedAt: new Date().toISOString(),
    createdBy: `mqtt-bin-${binId}`
  });
}

async function publishTelemetry(topic, messageObj) {
  const data = typeof messageObj === 'string' ? JSON.parse(messageObj) : messageObj;
  // If MQTT broker client is connected, publish through MQTT network
  if (mqttClient && mqttClient.connected) {
    const payload = typeof messageObj === 'string' ? messageObj : JSON.stringify(messageObj);
    mqttClient.publish(topic, payload, { qos: 0 });
  }
  // Ingest immediately
  await handleTelemetryPacket(topic, data);
  return true;
}

function getIngestionLogs() {
  return ingestionLogs;
}

module.exports = {
  startIngestionService,
  publishTelemetry,
  getIngestionLogs
};
