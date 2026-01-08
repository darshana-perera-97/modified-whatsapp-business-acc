// Types are defined as JSDoc comments for JavaScript

/**
 * @typedef {Object} Chat
 * @property {string} id
 * @property {string} name
 * @property {string} avatar
 * @property {string} lastMessage
 * @property {string} timestamp
 * @property {number} [unread]
 * @property {'online' | 'offline' | 'away'} [status]
 */

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} text
 * @property {string} timestamp
 * @property {'me' | 'them'} sender
 * @property {'sent' | 'delivered' | 'read'} [status]
 */

/**
 * @typedef {Object} Snippet
 * @property {string} id
 * @property {string} title
 * @property {string} content
 * @property {string} category
 * @property {string} [icon]
 */

export {};

