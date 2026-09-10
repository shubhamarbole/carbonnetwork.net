const templateService = require('./templateService');
const apiKeyService = require('./apiKeyService');
const usageService = require('./usageService');

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';

class PlatformController {
  // Templates
  async listTemplates(req, res, next) {
    try {
      const list = await templateService.listTemplates();
      res.json({ success: true, data: list });
    } catch (err) {
      next(err);
    }
  }

  async getTemplate(req, res, next) {
    try {
      const tmpl = await templateService.getTemplate(req.params.industry);
      res.json({ success: true, data: tmpl });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ success: false, message: err.message });
      next(err);
    }
  }

  async applyTemplate(req, res, next) {
    try {
      const result = await templateService.applyTemplate(req.user, req.params.industry);
      res.json({ success: true, data: result });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ success: false, message: err.message });
      next(err);
    }
  }

  // API Keys
  async listApiKeys(req, res, next) {
    try {
      const keys = await apiKeyService.listApiKeys(req.user);
      res.json({ success: true, data: keys });
    } catch (err) {
      next(err);
    }
  }

  async createApiKey(req, res, next) {
    try {
      const role = (req.user.role || '').toUpperCase();
      if (role === 'VIEWER') {
        return res.status(403).json({ success: false, message: 'VIEWER role cannot generate API keys' });
      }
      const key = await apiKeyService.createApiKey(req.user, req.body);
      res.status(201).json({ success: true, data: key });
    } catch (err) {
      next(err);
    }
  }

  async revokeApiKey(req, res, next) {
    try {
      const result = await apiKeyService.revokeApiKey(req.user, req.params.id);
      res.json({ success: true, data: result });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ success: false, message: err.message });
      next(err);
    }
  }

  // Usage & Costs
  async getUsageAndCosts(req, res, next) {
    try {
      const summary = await usageService.getTenantUsageAndCosts(req.user, req.query.period);
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  // Platform Operations (Platform Admin / Super Admin)
  async getPlatformOperations(req, res, next) {
    try {
      const role = (req.user.role || '').toUpperCase();
      if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN' && role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Access restricted to Platform Administrators' });
      }
      const ops = await usageService.getPlatformOperationsSummary();
      res.json({ success: true, data: ops });
    } catch (err) {
      next(err);
    }
  }

  // Tools Registry proxy
  async listTools(req, res, next) {
    try {
      const pyRes = await fetch(`${PYTHON_AI_URL}/internal/tools/registry`);
      if (!pyRes.ok) throw new Error(`Python tools registry returned ${pyRes.status}`);
      const tools = await pyRes.json();
      res.json({ success: true, data: tools });
    } catch (err) {
      next(err);
    }
  }

  async toggleTool(req, res, next) {
    try {
      const role = (req.user.role || '').toUpperCase();
      if (role === 'VIEWER') {
        return res.status(403).json({ success: false, message: 'VIEWER role cannot modify tool registry' });
      }
      const pyRes = await fetch(`${PYTHON_AI_URL}/internal/tools/${req.params.name}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: Boolean(req.body.enabled) })
      });
      if (!pyRes.ok) throw new Error(`Python tool update returned ${pyRes.status}`);
      const data = await pyRes.json();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // AI Model Gateway proxy
  async routeGateway(req, res, next) {
    try {
      const payload = {
        policy: req.body.policy || 'LOW_COST',
        system_prompt: req.body.system_prompt || req.body.systemPrompt || 'You are an ESG Risk and Sustainability AI analyst.',
        user_prompt: req.body.user_prompt || req.body.userPrompt || req.body.prompt || 'Analyze risk exposure',
        max_tokens: req.body.max_tokens || req.body.maxTokens || 500,
        temperature: req.body.temperature || 0.2
      };

      const pyRes = await fetch(`${PYTHON_AI_URL}/internal/gateway/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await pyRes.json();
      if (!pyRes.ok) return res.status(pyRes.status).json({ success: false, data });

      // Track platform usage asynchronously
      if (req.user && data.tokens_used) {
        await usageService.recordUsage({
          organizationId: req.user.organizationId,
          tokensPrompt: data.tokens_used.prompt_tokens || 0,
          tokensCompletion: data.tokens_used.completion_tokens || 0,
          modelUsed: data.model_used || 'mock-model-v1',
          providerUsed: data.provider || 'mock',
          costUsd: data.cost_usd || 0.0,
          computeSeconds: (data.latency_ms || 100) / 1000.0,
          featureArea: 'AI_GATEWAY',
          metadata: { policy: req.body.policy }
        });
      }

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getGatewayStatus(req, res, next) {
    try {
      const pyRes = await fetch(`${PYTHON_AI_URL}/internal/gateway/status`);
      const data = await pyRes.json();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PlatformController();
