const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let useMock = false;

function setUseMock(val) {
  useMock = val;
  if (val) {
    console.log("⚠️ Database system falling back to Mock JSON DB Engine!");
  }
}

const mockDataDir = path.join(__dirname, '../data');

class MockQuery {
  constructor(data) {
    this.data = data;
  }
  async exec() {
    return this.data;
  }
  sort(compareFn) {
    if (!this.data) return this;
    if (typeof compareFn === 'string') {
      const field = compareFn.replace('-', '');
      const desc = compareFn.startsWith('-');
      this.data.sort((a, b) => {
        let valA = a[field];
        let valB = b[field];
        if (valA === undefined) return desc ? 1 : -1;
        if (valB === undefined) return desc ? -1 : 1;
        if (typeof valA === 'string') {
          return desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        }
        return desc ? (valB - valA) : (valA - valB);
      });
    } else if (typeof compareFn === 'object') {
      const field = Object.keys(compareFn)[0];
      const desc = compareFn[field] === -1;
      this.data.sort((a, b) => {
        let valA = a[field];
        let valB = b[field];
        if (valA === undefined) return desc ? 1 : -1;
        if (valB === undefined) return desc ? -1 : 1;
        return desc ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
      });
    }
    return this;
  }
  limit(n) {
    this.data = this.data.slice(0, n);
    return this;
  }
  then(onfulfilled, onrejected) {
    return Promise.resolve(this.data).then(onfulfilled, onrejected);
  }
}

class MockModel {
  constructor(name, schema) {
    this.name = name;
    this.schema = schema;
    this.filePath = path.join(mockDataDir, `${name}.json`);
    if (!fs.existsSync(mockDataDir)) {
      fs.mkdirSync(mockDataDir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([]));
    }
  }

  _read() {
    try {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    } catch (e) {
      return [];
    }
  }

  _write(data) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  async find(query = {}) {
    const list = this._read();
    const filtered = list.filter(item => {
      for (let k in query) {
        if (query[k] !== undefined && query[k] !== null) {
          if (typeof query[k] === 'object' && query[k].$ne !== undefined) {
            if (item[k] === query[k].$ne) return false;
          } else if (item[k] !== query[k]) {
            return false;
          }
        }
      }
      return true;
    });
    return new MockQuery(filtered);
  }

  async findOne(query = {}) {
    const list = this._read();
    const found = list.find(item => {
      for (let k in query) {
        if (query[k] !== undefined && query[k] !== null) {
          if (item[k] !== query[k]) return false;
        }
      }
      return true;
    });
    return found || null;
  }

  async findById(id) {
    return this.findOne({ _id: id });
  }

  async create(data) {
    const list = this._read();
    const item = {
      _id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };
    list.push(item);
    this._write(list);
    return item;
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const list = this._read();
    const idx = list.findIndex(item => item._id === id);
    if (idx === -1) {
      if (options.upsert) {
        return this.create({ _id: id, ...update.$set });
      }
      return null;
    }
    
    const current = list[idx];
    let updated = { ...current };
    if (update.$set) {
      updated = { ...updated, ...update.$set };
    } else {
      updated = { ...updated, ...update };
    }
    updated.updatedAt = new Date().toISOString();
    list[idx] = updated;
    this._write(list);
    return updated;
  }

  async deleteOne(query = {}) {
    const list = this._read();
    const startLen = list.length;
    const filtered = list.filter(item => {
      for (let k in query) {
        if (item[k] === query[k]) return false;
      }
      return true;
    });
    this._write(filtered);
    return { deletedCount: startLen - filtered.length };
  }

  async findByIdAndDelete(id) {
    const list = this._read();
    const idx = list.findIndex(item => item._id === id || item.id === id);
    if (idx === -1) return null;
    const deleted = list.splice(idx, 1)[0];
    this._write(list);
    return deleted;
  }

  async countDocuments(query = {}) {
    const res = await this.find(query);
    return res.data.length;
  }
}

function defineModel(modelName, schemaDef, indexes = []) {
  const schema = new mongoose.Schema(schemaDef, { timestamps: true });
  if (Array.isArray(indexes)) {
    indexes.forEach(idx => {
      if (Array.isArray(idx)) {
        schema.index(idx[0], idx[1]);
      } else {
        schema.index(idx);
      }
    });
  }
  let mongooseModel;
  try {
    mongooseModel = mongoose.model(modelName, schema);
  } catch (e) {
    mongooseModel = mongoose.model(modelName);
  }

  const mockModel = new MockModel(modelName, schemaDef);

  class ProxyModel {
    constructor(data = {}) {
      if (useMock) {
        Object.assign(this, data);
        if (!this._id) {
          this._id = Math.random().toString(36).substr(2, 9);
        }
        if (!this.createdAt) this.createdAt = new Date().toISOString();
        if (!this.updatedAt) this.updatedAt = new Date().toISOString();
      } else {
        return new mongooseModel(data);
      }
    }

    async save() {
      if (useMock) {
        const list = mockModel._read();
        const idx = list.findIndex(item => item._id === this._id);
        if (idx === -1) {
          list.push(this);
        } else {
          list[idx] = this;
        }
        mockModel._write(list);
        return this;
      }
    }
  }

  return new Proxy(ProxyModel, {
    get(target, prop) {
      if (useMock) {
        return mockModel[prop] !== undefined ? mockModel[prop] : target[prop];
      }
      if (mongooseModel[prop] !== undefined) {
        if (typeof mongooseModel[prop] === 'function') {
          return mongooseModel[prop].bind(mongooseModel);
        }
        return mongooseModel[prop];
      }
      return mockModel[prop] !== undefined ? mockModel[prop] : target[prop];
    },
    construct(target, args) {
      return new target(...args);
    }
  });
}

module.exports = {
  defineModel,
  setUseMock,
  isMock: () => useMock
};
