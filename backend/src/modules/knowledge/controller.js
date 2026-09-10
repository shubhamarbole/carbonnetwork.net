const fs = require('fs');
const path = require('path');
const { KnowledgeDocument, AuditLog, Project, Organization } = require('../../../models/models');

const isHex24 = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

const pythonServiceUrl = process.env.PYTHON_AI_URL || 'http://localhost:8000';
const internalKey = process.env.INTERNAL_SERVICE_KEY || 'esg-ai-internal-service-key-secret-2026';

const KnowledgeController = {
  // POST /api/knowledge/documents - Upload document
  async uploadDocument(req, res, next) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthenticated' });
      }

      if (user.role === 'VIEWER') {
        return res.status(403).json({ success: false, message: 'Forbidden: Viewers are not permitted to upload knowledge documents.' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded or file rejected by filter.' });
      }

      const { display_name, category, project_id } = req.body;
      let targetOrgId = user.organizationId;

      // Allow SUPER_ADMIN / PLATFORM_ADMIN to specify org
      if ((user.role === 'SUPER_ADMIN' || user.role === 'PLATFORM_ADMIN') && req.body.organization_id) {
        targetOrgId = req.body.organization_id;
      }

      if (!targetOrgId) {
        return res.status(400).json({ success: false, message: 'Missing organization identifier.' });
      }

      // If project_id is provided, verify project exists and belongs to targetOrgId
      if (project_id) {
        const query = isHex24(project_id)
          ? { $or: [{ _id: project_id }, { id: project_id }] }
          : { id: project_id };
        const project = await Project.findOne(query);
        if (project && project.organizationId && project.organizationId.toString() !== targetOrgId.toString() && user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
          return res.status(403).json({ success: false, message: 'Forbidden: Specified project does not belong to your organization.' });
        }
      }

      const document_id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const nowStr = new Date().toISOString();

      // Create KnowledgeDocument record
      const docRecord = await KnowledgeDocument.create({
        document_id,
        filename: req.file.originalname,
        display_name: display_name && display_name.trim() ? display_name.trim() : req.file.originalname,
        mime_type: req.file.mimetype || 'application/octet-stream',
        size: req.file.size,
        organization_id: targetOrgId.toString(),
        project_id: project_id || null,
        category: category || 'Other',
        uploaded_by: user.email || user.name || 'User',
        storage_location: req.file.path,
        processing_status: 'PROCESSING',
        processing_error: null,
        chunk_count: 0,
        embedding_model: '',
        created_at: nowStr,
        updated_at: nowStr
      });

      // Write KNOWLEDGE_DOCUMENT_UPLOADED audit log
      await AuditLog.create({
        organizationId: targetOrgId.toString(),
        user: user.email || user.name || 'User',
        userId: user.userId || user._id?.toString() || '',
        action: 'KNOWLEDGE_DOCUMENT_UPLOADED',
        riskId: document_id,
        module: 'KnowledgeBase',
        recordId: document_id,
        metadata: {
          document_id,
          filename: req.file.originalname,
          size: req.file.size,
          category: category || 'Other',
          project_id: project_id || null,
          timestamp: nowStr
        },
        timestamp: nowStr
      });

      // Trigger Python ingestion
      try {
        const ingestPayload = {
          document_id,
          file_path: path.resolve(req.file.path),
          filename: req.file.originalname,
          mime_type: req.file.mimetype || 'application/octet-stream',
          organization_id: targetOrgId.toString(),
          project_id: project_id || null,
          category: category || 'Other'
        };

        const pyResponse = await fetch(`${pythonServiceUrl}/internal/knowledge/ingest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service-Key': internalKey
          },
          body: JSON.stringify(ingestPayload)
        });

        const pyData = await pyResponse.json();
        const updatedTime = new Date().toISOString();

        if (pyResponse.ok && pyData.success && pyData.status === 'READY') {
          docRecord.processing_status = 'READY';
          docRecord.chunk_count = pyData.chunk_count;
          docRecord.embedding_model = pyData.embedding_model;
          docRecord.updated_at = updatedTime;
          await docRecord.save();

          // Write KNOWLEDGE_DOCUMENT_PROCESSED audit log
          await AuditLog.create({
            organizationId: targetOrgId.toString(),
            user: user.email || user.name || 'User',
            userId: user.userId || user._id?.toString() || '',
            action: 'KNOWLEDGE_DOCUMENT_PROCESSED',
            riskId: document_id,
            module: 'KnowledgeBase',
            recordId: document_id,
            metadata: {
              document_id,
              chunk_count: pyData.chunk_count,
              embedding_model: pyData.embedding_model,
              timestamp: updatedTime
            },
            timestamp: updatedTime
          });
        } else {
          const errMsg = pyData.error || pyData.detail || 'Document indexing failed';
          docRecord.processing_status = 'FAILED';
          docRecord.processing_error = errMsg;
          docRecord.updated_at = updatedTime;
          await docRecord.save();

          // Write KNOWLEDGE_DOCUMENT_PROCESSING_FAILED audit log
          await AuditLog.create({
            organizationId: targetOrgId.toString(),
            user: user.email || user.name || 'User',
            userId: user.userId || user._id?.toString() || '',
            action: 'KNOWLEDGE_DOCUMENT_PROCESSING_FAILED',
            riskId: document_id,
            module: 'KnowledgeBase',
            recordId: document_id,
            metadata: {
              document_id,
              error: errMsg,
              timestamp: updatedTime
            },
            timestamp: updatedTime
          });
        }
      } catch (ingestErr) {
        docRecord.processing_status = 'FAILED';
        docRecord.processing_error = `Could not reach indexing service: ${ingestErr.message}`;
        docRecord.updated_at = new Date().toISOString();
        await docRecord.save();
      }

      res.status(201).json({
        success: true,
        data: docRecord
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/knowledge/documents - List documents with tenant scoping
  async listDocuments(req, res, next) {
    try {
      const user = req.user;
      const query = {};

      // Tenant boundaries
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        query.organization_id = user.organizationId ? user.organizationId.toString() : '';
      } else if (req.query.organization_id) {
        query.organization_id = req.query.organization_id;
      }

      // Filter by project_id
      if (req.query.project_id) {
        query.project_id = req.query.project_id;
      }

      // Filter by category
      if (req.query.category && req.query.category !== 'ALL') {
        query.category = req.query.category;
      }

      // Filter by status
      if (req.query.status && req.query.status !== 'ALL') {
        query.processing_status = req.query.status;
      }

      // Filter by search keyword
      if (req.query.search && req.query.search.trim()) {
        const searchRegex = new RegExp(req.query.search.trim(), 'i');
        query.$or = [
          { filename: searchRegex },
          { display_name: searchRegex }
        ];
      }

      const docs = await KnowledgeDocument.find(query);
      const list = Array.isArray(docs) ? docs : (docs?.data || []);
      // Sort newest first
      list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      res.status(200).json({
        success: true,
        count: list.length,
        data: list
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/knowledge/documents/:id - Single document
  async getDocumentById(req, res, next) {
    try {
      const user = req.user;
      const docId = req.params.id;

      const query = isHex24(docId)
        ? { $or: [{ _id: docId }, { document_id: docId }] }
        : { document_id: docId };

      const doc = await KnowledgeDocument.findOne(query);
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Knowledge document not found.' });
      }

      // Tenant isolation
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        if (doc.organization_id && doc.organization_id.toString() !== user.organizationId?.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this document.' });
        }
      }

      res.status(200).json({
        success: true,
        data: doc
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/knowledge/documents/:id - Delete document and vectors
  async deleteDocument(req, res, next) {
    try {
      const user = req.user;
      if (user.role === 'VIEWER') {
        return res.status(403).json({ success: false, message: 'Forbidden: Viewers cannot delete knowledge documents.' });
      }

      const docId = req.params.id;
      const query = isHex24(docId)
        ? { $or: [{ _id: docId }, { document_id: docId }] }
        : { document_id: docId };

      const doc = await KnowledgeDocument.findOne(query);
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Knowledge document not found.' });
      }

      // Tenant check
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        if (doc.organization_id && doc.organization_id.toString() !== user.organizationId?.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this document.' });
        }
      }

      // 1. Delete vectors from Python Qdrant
      try {
        await fetch(`${pythonServiceUrl}/internal/knowledge/documents/${doc.document_id}`, {
          method: 'DELETE',
          headers: {
            'X-Internal-Service-Key': internalKey
          }
        });
      } catch (pyErr) {
        console.warn(`Vector deletion warning for ${doc.document_id}:`, pyErr.message);
      }

      // 2. Delete file from disk if present
      if (doc.storage_location && fs.existsSync(doc.storage_location)) {
        try {
          fs.unlinkSync(doc.storage_location);
        } catch (fsErr) {
          console.warn(`File unlink warning:`, fsErr.message);
        }
      }

      // 3. Delete DB record
      await KnowledgeDocument.deleteOne({ document_id: doc.document_id });

      const nowStr = new Date().toISOString();

      // 4. Write KNOWLEDGE_DOCUMENT_DELETED audit log
      await AuditLog.create({
        organizationId: doc.organization_id,
        user: user.email || user.name || 'User',
        userId: user.userId || user._id?.toString() || '',
        action: 'KNOWLEDGE_DOCUMENT_DELETED',
        riskId: doc.document_id,
        module: 'KnowledgeBase',
        recordId: doc.document_id,
        metadata: {
          document_id: doc.document_id,
          filename: doc.filename,
          timestamp: nowStr
        },
        timestamp: nowStr
      });

      res.status(200).json({
        success: true,
        message: 'Document and associated vectors deleted successfully.'
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/knowledge/documents/:id/reprocess - Trigger re-indexing
  async reprocessDocument(req, res, next) {
    try {
      const user = req.user;
      if (user.role === 'VIEWER') {
        return res.status(403).json({ success: false, message: 'Forbidden: Viewers cannot trigger document reprocessing.' });
      }

      const docId = req.params.id;
      const query = isHex24(docId)
        ? { $or: [{ _id: docId }, { document_id: docId }] }
        : { document_id: docId };

      const doc = await KnowledgeDocument.findOne(query);
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Knowledge document not found.' });
      }

      // Tenant check
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        if (doc.organization_id && doc.organization_id.toString() !== user.organizationId?.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this document.' });
        }
      }

      doc.processing_status = 'PROCESSING';
      doc.processing_error = null;
      doc.updated_at = new Date().toISOString();
      await doc.save();

      // Trigger Python ingestion
      try {
        const ingestPayload = {
          document_id: doc.document_id,
          file_path: path.resolve(doc.storage_location),
          filename: doc.filename,
          mime_type: doc.mime_type,
          organization_id: doc.organization_id,
          project_id: doc.project_id || null,
          category: doc.category
        };

        const pyResponse = await fetch(`${pythonServiceUrl}/internal/knowledge/ingest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service-Key': internalKey
          },
          body: JSON.stringify(ingestPayload)
        });

        const pyData = await pyResponse.json();
        const updatedTime = new Date().toISOString();

        if (pyResponse.ok && pyData.success && pyData.status === 'READY') {
          doc.processing_status = 'READY';
          doc.chunk_count = pyData.chunk_count;
          doc.embedding_model = pyData.embedding_model;
          doc.updated_at = updatedTime;
          await doc.save();

          // Write KNOWLEDGE_DOCUMENT_REPROCESSED audit log
          await AuditLog.create({
            organizationId: doc.organization_id,
            user: user.email || user.name || 'User',
            userId: user.userId || user._id?.toString() || '',
            action: 'KNOWLEDGE_DOCUMENT_REPROCESSED',
            riskId: doc.document_id,
            module: 'KnowledgeBase',
            recordId: doc.document_id,
            metadata: {
              document_id: doc.document_id,
              chunk_count: pyData.chunk_count,
              embedding_model: pyData.embedding_model,
              timestamp: updatedTime
            },
            timestamp: updatedTime
          });
        } else {
          doc.processing_status = 'FAILED';
          doc.processing_error = pyData.error || pyData.detail || 'Reprocessing failed';
          doc.updated_at = updatedTime;
          await doc.save();

          await AuditLog.create({
            organizationId: doc.organization_id,
            user: user.email || user.name || 'User',
            userId: user.userId || user._id?.toString() || '',
            action: 'KNOWLEDGE_DOCUMENT_PROCESSING_FAILED',
            riskId: doc.document_id,
            module: 'KnowledgeBase',
            recordId: doc.document_id,
            metadata: {
              document_id: doc.document_id,
              error: doc.processing_error,
              timestamp: updatedTime
            },
            timestamp: updatedTime
          });
        }
      } catch (netErr) {
        doc.processing_status = 'FAILED';
        doc.processing_error = `Service unreachable: ${netErr.message}`;
        doc.updated_at = new Date().toISOString();
        await doc.save();
      }

      res.status(200).json({
        success: true,
        data: doc
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/knowledge/search - Semantic search with strict tenant isolation
  async searchKnowledge(req, res, next) {
    try {
      const user = req.user;
      const { query_text, project_id, category, top_k, min_score } = req.body;

      if (!query_text || !query_text.trim()) {
        return res.status(400).json({ success: false, message: 'query_text is required.' });
      }

      let targetOrgId = user.organizationId;
      if ((user.role === 'SUPER_ADMIN' || user.role === 'PLATFORM_ADMIN') && req.body.organization_id) {
        targetOrgId = req.body.organization_id;
      }

      if (!targetOrgId) {
        return res.status(400).json({ success: false, message: 'Mandatory tenant isolation: organization identifier is missing.' });
      }

      const searchPayload = {
        query_text: query_text.trim(),
        organization_id: targetOrgId.toString(),
        project_id: project_id || null,
        category: category || null,
        top_k: Number(top_k) || 5,
        min_score: min_score !== undefined ? Number(min_score) : 0.2
      };

      const pyRes = await fetch(`${pythonServiceUrl}/internal/knowledge/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Key': internalKey
        },
        body: JSON.stringify(searchPayload)
      });

      if (!pyRes.ok) {
        const errJson = await pyRes.json().catch(() => ({}));
        return res.status(pyRes.status >= 400 && pyRes.status < 500 ? 400 : 502).json({
          success: false,
          message: errJson.detail || 'Knowledge search service error.'
        });
      }

      const results = await pyRes.json();
      res.status(200).json({
        success: true,
        count: results.length,
        data: results
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = KnowledgeController;
