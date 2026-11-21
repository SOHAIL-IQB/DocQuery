const mongoose = require('mongoose');

/**
 * True only for a real ObjectId or a 24-character hex string.
 * Stricter than mongoose.Types.ObjectId.isValid, which has historically accepted
 * any 12-character string — and it never lets objects like { $ne: null } through.
 */
const isObjectId = (value) => mongoose.isObjectIdOrHexString(value);

/** Casts an id for aggregation pipelines, where mongoose does not cast automatically. */
const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

module.exports = { isObjectId, toObjectId };
