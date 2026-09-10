/**
 * Background Job Recovery and Reliability Service
 * Enterprise Production Hardening (Sections 15 & 16)
 * 
 * Manages background job lifecycle, detects stale/incomplete jobs,
 * prevents duplicate execution via idempotency keys, and provides safe recovery.
 */

const crypto = require('crypto');
const logger = require('../common/logger');
let AuditLog;
try {
  AuditLog = require('../../../models/models').AuditLog;
} catch (e) {
  try {
    AuditLog = require('../../models/models').AuditLog;
  } catch (err) {
    AuditLog = null;
  }
}

class JobRecoveryService {
  constructor() {
    this.jobs = new Map();
    this.idempotencyMap = new Map();
    this.staleThresholdMs = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Register a new background job with an idempotency key
   */
  registerJob({ type, payload = {}, idempotencyKey = null, maxRetries = 3 }) {
    const key = idempotencyKey || crypto.createHash('sha256')
      .update(`${type}-${JSON.stringify(payload)}-${Date.now()}`)
      .digest('hex');

    if (this.idempotencyMap.has(key)) {
      const existingId = this.idempotencyMap.get(key);
      const existingJob = this.jobs.get(existingId);
      if (existingJob && ['PENDING', 'RUNNING', 'COMPLETED'].includes(existingJob.status)) {
        logger.info(`Idempotent job execution suppressed for key: ${key}`);
        return existingJob;
      }
    }

    const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const job = {
      jobId,
      type,
      status: 'PENDING',
      retryCount: 0,
      maxRetries,
      idempotencyKey: key,
      payload,
      createdTimestamp: new Date().toISOString(),
      startedTimestamp: null,
      completedTimestamp: null,
      error: null,
      recoveryEvents: []
    };

    this.jobs.set(jobId, job);
    this.idempotencyMap.set(key, jobId);
    logger.info(`Registered background job ${jobId} of type ${type}`);
    return job;
  }

  /**
   * Transition job to RUNNING
   */
  startJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    job.status = 'RUNNING';
    job.startedTimestamp = new Date().toISOString();
    return job;
  }

  /**
   * Transition job to COMPLETED
   */
  completeJob(jobId, result = null) {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    job.status = 'COMPLETED';
    job.completedTimestamp = new Date().toISOString();
    job.result = result;
    logger.info(`Job ${jobId} completed successfully`);
    return job;
  }

  /**
   * Transition job to FAILED
   */
  failJob(jobId, error) {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    job.status = 'FAILED';
    job.completedTimestamp = new Date().toISOString();
    job.error = typeof error === 'string' ? error : error?.message || 'Unknown error';
    logger.warn(`Job ${jobId} failed: ${job.error}`);
    return job;
  }

  /**
   * Scan and recover incomplete or crashed background jobs
   */
  async recoverIncompleteJobs(actor = 'system') {
    const now = Date.now();
    const recovered = [];
    const exhausted = [];

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'RUNNING') {
        const startTime = new Date(job.startedTimestamp || job.createdTimestamp).getTime();
        if (now - startTime > this.staleThresholdMs) {
          const eventTime = new Date().toISOString();
          if (job.retryCount < job.maxRetries) {
            job.retryCount += 1;
            job.status = 'RECOVERED';
            job.recoveryEvents.push({
              action: 'AUTO_RETRY',
              timestamp: eventTime,
              retryAttempt: job.retryCount,
              actor
            });
            recovered.push(job);
            logger.info(`Recovered stale job ${jobId}, scheduled for retry ${job.retryCount}/${job.maxRetries}`);
          } else {
            job.status = 'FAILED_SAFE';
            job.recoveryEvents.push({
              action: 'RETRY_EXHAUSTED',
              timestamp: eventTime,
              actor
            });
            exhausted.push(job);
            logger.warn(`Job ${jobId} exhausted retries (${job.maxRetries}), safely quarantined`);
          }

          // Emit audit log
          if (AuditLog) {
            try {
              await AuditLog.create({
                organizationId: job.payload?.organizationId || 'system',
                user: actor,
                action: 'JOB_RECOVERY_EXECUTED',
                module: 'JobManager',
                recordId: jobId,
                metadata: {
                  jobId,
                  type: job.type,
                  status: job.status,
                  retryCount: job.retryCount
                },
                timestamp: eventTime
              });
            } catch (auditErr) {
              logger.warn(`Failed to log audit for job recovery: ${auditErr.message}`);
            }
          }
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      scannedCount: this.jobs.size,
      recoveredCount: recovered.length,
      exhaustedCount: exhausted.length,
      recoveredJobs: recovered.map(j => ({ jobId: j.jobId, type: j.type, retryCount: j.retryCount })),
      exhaustedJobs: exhausted.map(j => ({ jobId: j.jobId, type: j.type, error: j.error }))
    };
  }

  /**
   * List all jobs with optional status filter
   */
  listJobs(statusFilter = null) {
    const list = Array.from(this.jobs.values());
    if (statusFilter) {
      return list.filter(j => j.status === statusFilter);
    }
    return list;
  }

  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  getMetrics() {
    const all = Array.from(this.jobs.values());
    return {
      total: all.length,
      pending: all.filter(j => j.status === 'PENDING').length,
      running: all.filter(j => j.status === 'RUNNING').length,
      completed: all.filter(j => j.status === 'COMPLETED').length,
      failed: all.filter(j => ['FAILED', 'FAILED_SAFE'].includes(j.status)).length,
      recovered: all.filter(j => j.status === 'RECOVERED').length
    };
  }
}

const defaultJobRecoveryService = new JobRecoveryService();

module.exports = defaultJobRecoveryService;
