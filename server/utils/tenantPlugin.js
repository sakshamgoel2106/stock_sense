const tenantStorage = require('./tenantStorage');

module.exports = function tenantPlugin(schema) {
  const hasCompany = Boolean(schema.path('company'));
  const hasOwner = Boolean(schema.path('owner'));

  // Global collections without tenant fields (e.g. User, Company, Membership, Invitation)
  if (!hasCompany && !hasOwner) {
    return;
  }

  schema.pre(/^find/, function (next) {
    if (process.env.NODE_ENV === 'test') return next();
    const tenantId = tenantStorage.getStore();
    if (tenantId) {
      if (hasCompany) {
        if (!this.getQuery().company) {
          this.where({ company: tenantId });
        }
      } else if (!this.getQuery().owner) {
        this.where({ owner: tenantId });
      }
    }
    next();
  });

  schema.pre(/^count/, function (next) {
    if (process.env.NODE_ENV === 'test') return next();
    const tenantId = tenantStorage.getStore();
    if (tenantId) {
      if (hasCompany) {
        if (!this.getQuery().company) {
          this.where({ company: tenantId });
        }
      } else if (!this.getQuery().owner) {
        this.where({ owner: tenantId });
      }
    }
    next();
  });

  schema.pre(/^(update|findOneAnd|delete)/, function (next) {
    if (process.env.NODE_ENV === 'test') return next();
    const tenantId = tenantStorage.getStore();
    if (tenantId) {
      if (hasCompany) {
        if (!this.getQuery().company) {
          this.where({ company: tenantId });
        }
      } else if (!this.getQuery().owner) {
        this.where({ owner: tenantId });
      }
    }
    next();
  });

  schema.pre('aggregate', function (next) {
    if (process.env.NODE_ENV === 'test') return next();
    const tenantId = tenantStorage.getStore();
    if (tenantId) {
      if (hasCompany) {
        this.pipeline().unshift({ $match: { company: tenantId } });
      } else {
        this.pipeline().unshift({ $match: { owner: tenantId } });
      }
    }
    next();
  });

  schema.pre('validate', function (next) {
    let tenantId = tenantStorage.getStore();
    if (process.env.NODE_ENV === 'test' && !tenantId) {
      tenantId = '000000000000000000000000'; // dummy ID for tests
    }
    if (tenantId) {
      if (hasCompany && !this.company) {
        this.company = tenantId;
      }
      if (!this.owner) {
        this.owner = tenantId;
      }
    }
    next();
  });

  schema.pre('save', function (next) {
    let tenantId = tenantStorage.getStore();
    if (process.env.NODE_ENV === 'test' && !tenantId) {
      tenantId = '000000000000000000000000'; // dummy ID for tests
    }
    if (tenantId) {
      if (hasCompany && !this.company) {
        this.company = tenantId;
      }
      if (!this.owner) {
        this.owner = tenantId;
      }
    }
    next();
  });

  schema.pre('insertMany', function (next, docs) {
    const tenantId = tenantStorage.getStore();
    if (tenantId) {
      docs.forEach(doc => {
        if (hasCompany && !doc.company) doc.company = tenantId;
        if (!doc.owner) doc.owner = tenantId;
      });
    }
    next();
  });
};
