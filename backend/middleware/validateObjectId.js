const { isObjectId } = require('../utils/objectId');

/**
 * Route middleware that answers 404 for an id that cannot exist, before any
 * controller or database query runs. Keeps controllers free of ID parsing.
 *
 * @param {string} field   route param or body field holding the id
 * @param {object} [opts]
 * @param {'params'|'body'} [opts.source='params']
 * @param {string} [opts.resource='Resource']  used in the error message, e.g. "Chat not found"
 *
 * A missing body field is passed through so the controller can report it as a 400.
 */
const validateObjectId = (field, { source = 'params', resource = 'Resource' } = {}) =>
  function validateObjectIdMiddleware(req, res, next) {
    const value = req[source]?.[field];
    if (source === 'body' && (value === undefined || value === null || value === '')) return next();
    if (!isObjectId(value)) {
      return res.status(404).json({ success: false, error: `${resource} not found` });
    }
    next();
  };

module.exports = { validateObjectId };
