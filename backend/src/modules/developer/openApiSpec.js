/**
 * OpenAPI 3.0.3 Specification for ESG & CarbonCredit.Network Public Developer API v1
 */
function getOpenApiSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'ESG & CarbonCredit.Network Enterprise Developer API',
      version: '1.0.0',
      description: 'Authoritative, controlled public API platform for enterprise ESG risk intelligence, predictive forecasting, AI Agent automation, and operational monitoring.',
      contact: {
        name: 'CarbonCredit.Network Developer Platform',
        url: 'https://carboncredit.network/developer',
        email: 'api-support@carboncredit.network'
      },
      license: {
        name: 'Enterprise Commercial License'
      }
    },
    servers: [
      {
        url: 'http://localhost:5050/api/v1',
        description: 'Local Production Gateway'
      },
      {
        url: 'https://api.carboncredit.network/v1',
        description: 'Global Production Gateway'
      }
    ],
    security: [
      { ApiKeyAuth: [] },
      { OAuth2: [] }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Production or Sandbox API Key (e.g. esg_live_... or esg_test_...)'
        },
        OAuth2: {
          type: 'oauth2',
          description: 'OAuth 2.0 Client Credentials Grant',
          flows: {
            clientCredentials: {
              tokenUrl: '/api/v1/oauth/token',
              scopes: {
                'risk:read': 'Read authoritative risk records and score history',
                'risk:write': 'Create and update enterprise risk items',
                'prediction:read': 'Access machine learning trajectory forecasts and emerging risks',
                'analysis:read': 'View LLM-generated risk analyses',
                'analysis:run': 'Execute deep LLM risk evaluations',
                'agent:run': 'Execute Phase 5 AI Risk Agent workflows with tool calling',
                'knowledge:search': 'Query vector RAG knowledge base for regulatory evidence',
                'scenario:read': 'View macroeconomic stress scenario definitions',
                'scenario:run': 'Run stress simulations against portfolio risks',
                'alert:read': 'Retrieve active and historic operational alerts',
                'alert:write': 'Acknowledge, resolve, and update alerts',
                'workflow:read': 'Inspect automated workflow instances and steps',
                'workflow:write': 'Dispatch or approve mitigation workflows',
                'decision:read': 'Inspect multi-option decision analyses',
                'decision:write': 'Create or execute risk mitigation decisions',
                'executive:read': 'Access executive board briefings and overall portfolio indices',
                'report:read': 'Read audit-grade ESG compliance reports',
                'report:generate': 'Generate PDF/Excel sustainability disclosures'
              }
            }
          }
        }
      },
      schemas: {
        StandardMeta: {
          type: 'object',
          properties: {
            request_id: { type: 'string', example: 'REQ-a82f091c' }
          },
          required: ['request_id']
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            page_size: { type: 'integer', example: 25 },
            total: { type: 'integer', example: 142 }
          },
          required: ['page', 'page_size', 'total']
        },
        StandardSuccessEnvelope: {
          type: 'object',
          properties: {
            data: { type: 'object' },
            meta: { $ref: '#/components/schemas/StandardMeta' }
          },
          required: ['data', 'meta']
        },
        StandardErrorEnvelope: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                request_id: { type: 'string' }
              },
              required: ['code', 'message', 'request_id']
            }
          },
          required: ['error']
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  enum: [
                    'INVALID_REQUEST', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND',
                    'CONFLICT', 'VALIDATION_ERROR', 'RATE_LIMITED', 'INTERNAL_ERROR',
                    'UPSTREAM_ERROR', 'SERVICE_UNAVAILABLE'
                  ],
                  example: 'FORBIDDEN'
                },
                message: { type: 'string', example: 'Missing required scope [risk:write]' },
                request_id: { type: 'string', example: 'REQ-a82f091c' }
              },
              required: ['code', 'message', 'request_id']
            }
          },
          required: ['error']
        },
        RiskItem: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '6a9bf53c908fc37a07f169ee' },
            title: { type: 'string', example: 'Supply Chain Maritime Fuel Sulfur Exceedance' },
            category: { type: 'string', example: 'Environmental' },
            severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], example: 'HIGH' },
            status: { type: 'string', enum: ['OPEN', 'UNDER_REVIEW', 'MITIGATION_IN_PROGRESS', 'MITIGATED', 'CLOSED'], example: 'OPEN' },
            probability: { type: 'number', example: 65 },
            impact: { type: 'number', example: 70 },
            risk_score: { type: 'number', example: 68.25 },
            organizationId: { type: 'string', example: '6a927a855b26a2ad8b17be30' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        PredictionRecord: {
          type: 'object',
          properties: {
            prediction_id: { type: 'string', example: 'pred_5fa139b2' },
            risk_id: { type: 'string', example: '6a9bf53c908fc37a07f169ee' },
            predicted_score: { type: 'number', example: 74.5 },
            critical_probability: { type: 'number', example: 0.68 },
            trend: { type: 'string', enum: ['INCREASING', 'STABLE', 'DECREASING'], example: 'INCREASING' },
            prediction_horizon_days: { type: 'integer', example: 30 },
            top_predictive_factors: {
              type: 'array',
              items: { type: 'string' },
              example: ['Historical maritime audit citations (+14%)', 'Fuel market sulfur non-compliance trend']
            }
          }
        },
        AgentRun: {
          type: 'object',
          properties: {
            agent_run_id: { type: 'string', example: 'run_8fa29c11' },
            goal: { type: 'string', example: 'Evaluate Scope 3 logistics non-compliance risks and recommend actions.' },
            status: { type: 'string', enum: ['PENDING', 'RUNNING', 'WAITING_FOR_APPROVAL', 'COMPLETED', 'FAILED'], example: 'COMPLETED' },
            summary: { type: 'string', example: 'Identified 2 critical logistics bottlenecks; recommended dual-supplier protocol.' },
            steps_count: { type: 'integer', example: 3 },
            created_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    paths: {
      '/oauth/token': {
        post: {
          summary: 'Obtain OAuth 2.0 Access Token',
          description: 'OAuth 2.0 client credentials token exchange endpoint.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    grant_type: { type: 'string', example: 'client_credentials' },
                    client_id: { type: 'string' },
                    client_secret: { type: 'string' },
                    scope: { type: 'string', example: 'risk:read risk:write' }
                  },
                  required: ['grant_type', 'client_id', 'client_secret']
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Issued bearer access token',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      access_token: { type: 'string' },
                      token_type: { type: 'string', example: 'Bearer' },
                      expires_in: { type: 'integer', example: 3600 },
                      scope: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/risks': {
        get: {
          summary: 'List enterprise risks',
          description: 'Returns paginated risk records scoped to the authenticated tenant.',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['risk:read'] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'page_size', in: 'query', schema: { type: 'integer', default: 25, maximum: 100 } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'severity', in: 'query', schema: { type: 'string' } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'project', in: 'query', schema: { type: 'string' } }
          ],
          responses: {
            200: {
              description: 'Collection of risks',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/RiskItem' } },
                      pagination: { $ref: '#/components/schemas/PaginationMeta' },
                      meta: { $ref: '#/components/schemas/StandardMeta' }
                    }
                  }
                }
              }
            },
            401: { $ref: '#/components/responses/401Error' },
            403: { $ref: '#/components/responses/403Error' }
          }
        },
        post: {
          summary: 'Create an enterprise risk',
          description: 'Creates a new risk record. Supports Idempotency-Key header for duplicate protection.',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['risk:write'] }],
          parameters: [
            { name: 'Idempotency-Key', in: 'header', schema: { type: 'string' }, required: false }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', example: 'Heavy Fuel Oil Emulsification Anomaly' },
                    category: { type: 'string', example: 'Environmental' },
                    severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], example: 'HIGH' },
                    probability: { type: 'number', example: 60 },
                    impact: { type: 'number', example: 75 },
                    description: { type: 'string', example: 'Excess sulfur discovered during batch fuel testing at Terminal 4.' }
                  },
                  required: ['title', 'category', 'severity']
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Created risk record',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/RiskItem' },
                      meta: { $ref: '#/components/schemas/StandardMeta' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/risks/{id}': {
        get: {
          summary: 'Retrieve risk details',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['risk:read'] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: {
              description: 'Risk record details'
            }
          }
        },
        patch: {
          summary: 'Update risk attributes',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['risk:write'] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Updated risk record' }
          }
        }
      },
      '/risks/{id}/predictions': {
        get: {
          summary: 'Get ML predictive trajectory history for a risk',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['prediction:read'] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Forecast history' } }
        }
      },
      '/risks/{id}/predict': {
        post: {
          summary: 'Trigger ML trajectory forecast for a risk',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['prediction:read', 'analysis:run'] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Generated trajectory forecast' } }
        }
      },
      '/risks/{id}/analyze': {
        post: {
          summary: 'Execute LLM risk analysis',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['analysis:run'] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Synthesized LLM risk analysis' } }
        }
      },
      '/agent/runs': {
        post: {
          summary: 'Initiate autonomous Phase 5 AI Agent run',
          description: 'Executes an AI Agent investigation against a natural language goal.',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['agent:run'] }],
          parameters: [
            { name: 'Idempotency-Key', in: 'header', schema: { type: 'string' }, required: false }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    goal: { type: 'string', example: 'Assess critical supplier logistics risks and recommend immediate mitigations.' }
                  },
                  required: ['goal']
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Created agent run',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/AgentRun' },
                      meta: { $ref: '#/components/schemas/StandardMeta' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/agent/runs/{id}': {
        get: {
          summary: 'Get agent run status and summary',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['agent:run'] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Agent run status' } }
        }
      },
      '/agent/runs/{id}/steps': {
        get: {
          summary: 'Get intermediate agent reasoning steps and tool observations',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['agent:run'] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Step timeline' } }
        }
      },
      '/scenarios': {
        post: {
          summary: 'Create a macroeconomic climate stress scenario',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['scenario:run'] }],
          responses: { 201: { description: 'Scenario created' } }
        }
      },
      '/scenarios/{id}': {
        get: {
          summary: 'Retrieve scenario definition',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['scenario:read'] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Scenario record' } }
        }
      },
      '/scenarios/{id}/run': {
        post: {
          summary: 'Execute stress scenario simulation against tenant risks',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['scenario:run'] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Simulation outcomes' } }
        }
      },
      '/alerts': {
        get: {
          summary: 'List active operational alerts',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['alert:read'] }],
          responses: { 200: { description: 'Alert collection' } }
        }
      },
      '/alerts/{id}': {
        get: {
          summary: 'Get alert details',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['alert:read'] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Alert details' } }
        }
      },
      '/workflows': {
        get: {
          summary: 'List active mitigation workflow instances',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['workflow:read'] }],
          responses: { 200: { description: 'Workflows collection' } }
        }
      },
      '/workflows/{id}': {
        get: {
          summary: 'Get workflow instance details and step logs',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['workflow:read'] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Workflow details' } }
        }
      },
      '/executive/overview': {
        get: {
          summary: 'Retrieve authoritative executive portfolio risk indices',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['executive:read'] }],
          responses: { 200: { description: 'Executive portfolio index' } }
        }
      },
      '/executive/emerging-risks': {
        get: {
          summary: 'Retrieve high-probability emerging risk radar items',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['executive:read'] }],
          responses: { 200: { description: 'Emerging risk items' } }
        }
      },
      '/webhooks': {
        get: {
          summary: 'List registered webhook endpoints',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['alert:read', 'workflow:read'] }],
          responses: { 200: { description: 'List of registered webhooks' } }
        },
        post: {
          summary: 'Register a new signed webhook endpoint',
          security: [{ ApiKeyAuth: [] }, { OAuth2: ['alert:write', 'workflow:write'] }],
          responses: { 201: { description: 'Registered webhook with signing secret' } }
        }
      }
    }
  };
}

module.exports = { getOpenApiSpec };
